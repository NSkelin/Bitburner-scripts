import {NS} from "@ns";
import {copyLibScripts, forEachServer, forEachServerOptions, getServerFreeRam} from "lib/helpers";
import {createMutex} from "lib/mutex";

interface Script {
  script: string;
  threads: number;
  args?: (string | number | boolean)[];
}

// create a lock & queue to stop multiple allocations from allocating to the same server and possibly running out of ram.
const mutex = createMutex();

/** Finds the script with the smallest ram cost and returns the cost. */
function getSmallestScriptRamCost(ns: NS, scripts: Script[]) {
  let smallestScriptRamCost = -1; // start -1 so the first script is the smallest
  for (const {script} of scripts) {
    const scriptRam = ns.getScriptRam(script);

    // script ram cost smaller than smallest?
    if (scriptRam < smallestScriptRamCost || smallestScriptRamCost === -1) {
      smallestScriptRamCost = scriptRam;
    }
  }
  return smallestScriptRamCost;
}

/** Gets a list of servers that can run atleast 1 of the scripts and their total combined ram. */
async function getUsableServers(
  ns: NS,
  scripts: Script[],
  allowThreadSplitting: ExecuteOptions["allowThreadSplitting"],
  serverOptions: AllocateScriptsOptions["serverOptions"]
) {
  const smallestScriptRamCost = getSmallestScriptRamCost(ns, scripts);
  const usableServers: {name: string; freeRam: number}[] = [];
  let totalAvailableRam = 0;

  const callBack = (ns: NS, serverName: string) => {
    const serverFreeRam = getServerFreeRam(ns, serverName);

    // Dont add servers that cannot even run the smallest script whole, while thread splitting is disabled.
    if (allowThreadSplitting === false && serverFreeRam < smallestScriptRamCost) return;

    totalAvailableRam += serverFreeRam;
    // save the server as usable.
    usableServers.push({name: serverName, freeRam: serverFreeRam});
  };

  await forEachServer(ns, callBack, {...serverOptions, rootAccessOnly: true});

  return {usableServers, totalAvailableRam};
}

/** Runs the allocated scripts onto their allocated servers and returns the scripts pid and the server its running on, or null if it failed to allocated any scripts. */
async function allocate(ns: NS, allocation: Map<string, Script[]>) {
  if (allocation.size > 0) {
    const executedServers: {server: string; pid: number}[] = [];

    // start scripts on their allocated server
    allocation.forEach((scripts, server) => {
      copyLibScripts(ns, server);
      for (const {script, threads, args = []} of scripts) {
        ns.scp(script, server);
        const pid = ns.exec(script, server, threads, ...args);
        executedServers.push({server, pid});
      }
    });
    return executedServers;
  } else {
    return null;
  }
}

/** Options used for controlling how the scripts can be run. */
interface ExecuteOptions {
  /** If true, the scripts will only run if there is enough ram to run them all, otherwise no scripts will run. */
  allOrNothing?: boolean;
  /** Forces the scripts to all be ran on the same server. */
  sameServer?: boolean;
  /** Allow breaking up multi-thread scripts into more scripts with smaller threads to fit in ram better.
   * The same amount of threads will still be ran. */
  allowThreadSplitting?: boolean;
}

export interface AllocateScriptsOptions {
  /** Options used for controlling where the scripts can be run. */
  serverOptions?: Omit<forEachServerOptions, "rootAccessOnly">;
  executeOptions?: ExecuteOptions;
}
/** Automatically allocates scripts across multiple servers memory */
export async function allocateScripts(ns: NS, scripts: Script[], options?: AllocateScriptsOptions) {
  const unlock = await mutex.lock();
  // setup forEachServer() options
  const allocationServerOptions: AllocateScriptsOptions["serverOptions"] = {
    includeHomeServer: options?.serverOptions?.includeHomeServer ?? false,
    includePurchasedServers: options?.serverOptions?.includePurchasedServers ?? true,
    UnownedServers: {
      include: options?.serverOptions?.UnownedServers?.include ?? false,
    },
  };

  // setup allocation options
  const allOrNothing = options?.executeOptions?.allOrNothing ?? false;
  const sameServer = options?.executeOptions?.sameServer ?? false;
  const allowThreadSplitting = options?.executeOptions?.allowThreadSplitting ?? false;

  // get script & server information
  const totalRequiredRam = scripts.reduce((accumulator, {script, threads}) => (accumulator += ns.getScriptRam(script) * threads), 0);
  const {usableServers, totalAvailableRam} = await getUsableServers(ns, scripts, allowThreadSplitting, allocationServerOptions);

  // if all the servers combined cant run all the scripts, return
  if (allOrNothing && totalAvailableRam < totalRequiredRam) return null;
  // sort servers by smallest ram first so i can fill up empty spaces before using another server
  usableServers.sort((serverA, serverB) => getServerFreeRam(ns, serverA.name) - getServerFreeRam(ns, serverB.name));

  const allocation: Map<string, Script[]> = new Map();

  // find a solution to allocate scripts
  findAllocation(0);
  const allocatedScripts = allocate(ns, allocation);
  unlock();
  return allocatedScripts;

  function findAllocation(scriptIndex: number) {
    if (scriptIndex === scripts.length) {
      // All scripts have been allocated
      return true;
    }

    const script = scripts[scriptIndex];
    const scriptRamCost = ns.getScriptRam(script.script) * 1000;

    for (const server of usableServers) {
      const serverMaxThreads = Math.floor(server.freeRam / scriptRamCost);
      const serverCanRunWholeScript = serverMaxThreads >= script.threads;

      // Server cant run all the scripts, try another.
      if (sameServer && server.freeRam < totalRequiredRam) continue;
      // Server cant run the whole script and the script cant be split across multiple servers
      else if (serverCanRunWholeScript === false && allowThreadSplitting === false) continue;
      // Server doesnt have enough ram to run a single thread
      else if (server.freeRam < scriptRamCost) continue;

      // Add the server to the allocation.
      if (!allocation.has(server.name)) {
        allocation.set(server.name, []);
      }

      const scriptThreadsToRun = serverMaxThreads > script.threads ? script.threads : serverMaxThreads;
      // Update server ram and remaining script threads to run.
      script.threads -= scriptThreadsToRun;
      server.freeRam -= scriptRamCost * scriptThreadsToRun;

      // Allocate the script.
      allocation.get(server.name)!.push({script: script.script, threads: scriptThreadsToRun, args: script.args});

      // if the script had all threads executed, goto the next script, otherwise try adding the remaining threads to another server
      if (script.threads === 0) scriptIndex++;

      // Scripts successfully allocated, return true
      if (findAllocation(scriptIndex)) return true;

      // Scripts failed to fully allocate, remove the allocated script
      allocation.get(server.name)!.pop();
      script.threads += scriptThreadsToRun;
      server.freeRam += scriptRamCost * scriptThreadsToRun;

      // Remove server from the allocation
      if (allocation.get(server.name)?.length === 0) {
        allocation.delete(server.name);
      }
    }
    // No servers can support the script
    return false;
  }
}
