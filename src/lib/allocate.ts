import {NS} from "@ns";
import {forEachServer, forEachServerOptions, getServerFreeRam} from "lib/helpers";
import {createMutex} from "lib/mutex";

export interface Script {
  /** Name of the script to be run. */
  script: string;
  /** Number of threads to run the script with. */
  threads: number;
  /** Optional args to run the script with. */
  args?: (string | number | boolean)[];
  /** Any files to include when copying the script over. */
  files?: string[];
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
  const allowThreadSplitting = options?.executeOptions?.allowThreadSplitting ?? false;

  // get script & server information
  const totalRequiredRam = scripts.reduce((accumulator, {script, threads}) => (accumulator += ns.getScriptRam(script) * threads), 0);
  const {usableServers, totalAvailableRam} = await getUsableServers(ns, scripts, allowThreadSplitting, allocationServerOptions);

  // if all the servers combined cant run all the scripts, return
  if ((allOrNothing && totalAvailableRam < totalRequiredRam * 1000) || (allOrNothing && !canRunScripts(ns, scripts, usableServers))) {
    unlock();
    return null;
  }

  const allocations: {script: string; pids: number[]}[] = [];
  for (const {script, threads, args, files} of scripts) {
    const pids = runScript(
      ns,
      script,
      threads,
      usableServers.map(({name}) => name),
      files,
      args,
      allowThreadSplitting
    );
    if (pids) allocations.push({script, pids});
  }

  unlock();
  return allocations;
}

function canRunScripts(ns: NS, scripts: {script: string; threads: number}[], servers: {name: string; freeRam: number}[]) {
  // eslint-disable-next-line prefer-const
  for (let {script, threads} of scripts) {
    const scriptRamCost = ns.getScriptRam(script);

    for (let {freeRam} of servers) {
      if (scriptRamCost <= freeRam) {
        const maxThreads = Math.floor(freeRam / scriptRamCost);

        // Clamp thread count to remaining threads.
        const scriptThreads = maxThreads > threads ? threads : maxThreads;
        threads -= scriptThreads;
        freeRam = freeRam - scriptThreads * scriptRamCost;
        if (threads === 0) break;
      }
    }
    if (threads === 0) break;
    return false;
  }
  return true;
}

function runScript(
  ns: NS,
  script: string,
  threads: number,
  servers: string[],
  dependencies: string[] = [],
  args: (string | number | boolean)[] = [],
  allowThreadSplitting = true
) {
  const pids: number[] = [];
  const scriptRamCost = ns.getScriptRam(script);

  for (const server of servers) {
    const serverFreeRam = getServerFreeRam(ns, server) / 1000;

    if (serverFreeRam < scriptRamCost * threads && allowThreadSplitting === false) continue;
    else if (scriptRamCost <= serverFreeRam) {
      const maxThreads = Math.floor(serverFreeRam / scriptRamCost);

      // Clamp thread count to remaining threads.
      const scriptThreads = maxThreads > threads ? threads : maxThreads;

      ns.scp([script, ...dependencies, ...ns.ls("home", "lib")], server, "home");
      pids.push(ns.exec(script, server, scriptThreads, ...args));
      threads -= scriptThreads;
      if (threads === 0) return;
    }
  }
  return pids;
}
