import {NS} from "@ns";
import {AllocateScriptsOptions, allocateScripts} from "./lib/allocate";
import {getOptimalHackingThreads, serverMoneyAtMax, serverSecurityAtMinimum} from "./lib/hackerUtils";

const allocationOptions: AllocateScriptsOptions = {
  executeOptions: {
    allOrNothing: false,
    allowThreadSplitting: true,
    sameServer: false,
  },
  serverOptions: {
    includeHomeServer: true,
    includePurchasedServers: true,
  },
};

/** Waits for a given condition to return true before then stops all the given scripts. */
async function stopScriptsAfterCondition(ns: NS, condition: () => boolean, scripts: {pid: number; server: string}[]) {
  while (condition() === false) {
    await ns.sleep(5000);
  }

  for (const {pid} of scripts) {
    ns.kill(pid);
  }
}

/** Lowers the target servers security to its minimum possible level.
 *
 * Calculates the threads required to minimize the servers security to its minimum, then runs as many threads as possible.
 * Once the servers security is at its minimum the weakener script(s) are automatically stopped.
 * @param server The server to lower security on.
 */
async function weakenSecurityToMinimum(ns: NS, server: string) {
  // server security already min, exit early.
  if (serverSecurityAtMinimum(ns, server) === true) return;

  // get thread count needed to minimize security level.
  const securityLevelLeft = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server);
  let threadCount = 1;
  while (securityLevelLeft > ns.weakenAnalyze(threadCount)) {
    threadCount++;
  }

  // Try to start weakener scripts.
  const scriptPids = await allocateScripts(ns, [{script: "minRunners/minWeaken.js", threads: threadCount, args: [server]}], allocationOptions);
  if (scriptPids == null || scriptPids.length === 0) return;

  // wait until the servers security is at its minimum.
  await stopScriptsAfterCondition(ns, () => serverSecurityAtMinimum(ns, server), scriptPids);
}

/** Grows the target servers money to its maximum possible amount while keeping the security to a minimum.
 *
 * Calculates the threads required to grow the servers money by 10%, then runs as many threads as possible.
 * Once the servers money is at its maximum the grower script(s) are automatically stopped.
 * @param server The server to grow money on.
 */
async function growMoneyToMaximum(ns: NS, server: string) {
  // server money already max, exit early.
  if (serverMoneyAtMax(ns, server) === true) return;

  // get thread count needed to grow money by 10%.
  const {growthThreads, weakenThreads} = getOptimalHackingThreads(ns, server, 0.1);
  if (growthThreads === 0 || weakenThreads === 0) return;

  // Try to start grower scripts.
  const scripts = [
    {script: "minRunners/minGrow.js", threads: growthThreads, args: [server]},
    {script: "minRunners/minWeaken.js", threads: weakenThreads, args: [server]},
  ];
  const scriptPids = await allocateScripts(ns, scripts, allocationOptions);
  if (scriptPids == null || scriptPids.length === 0) return;

  // wait until the servers money is at its maximum.
  await stopScriptsAfterCondition(ns, () => serverMoneyAtMax(ns, server), scriptPids);
}

/** Continously hacks the target server for 10% of its money while maintaining its money at maximum and security at minimum.
 * @param target The server to be hacked.
 */
async function hackTarget(ns: NS, target: string) {
  // get thread count needed to maintain hack.
  const {hackThreads, growthThreads, weakenThreads} = getOptimalHackingThreads(ns, target, 0.1);
  if (hackThreads === 0 || growthThreads === 0 || weakenThreads === 0) return;

  // Try to start hacking scripts.
  const scripts = [
    {script: "minRunners/minHack.js", threads: hackThreads, args: [target]},
    {script: "minRunners/minGrow.js", threads: growthThreads, args: [target]},
    {script: "minRunners/minWeaken.js", threads: weakenThreads, args: [target]},
  ];
  await allocateScripts(ns, scripts, {...allocationOptions, executeOptions: {allOrNothing: true}});
}

/** Primes a server for hacking by lowering its security to the minimum and
 * growing its available money to the maximum.
 * @param server The server to prime for hacking.
 */
async function primeServer(ns: NS, server: string) {
  await weakenSecurityToMinimum(ns, server);
  await growMoneyToMaximum(ns, server);
  await weakenSecurityToMinimum(ns, server); // redo to ensure security is minimum.
}

/** Prepares a server for hacking, then hacks it. */
export async function main(ns: NS) {
  const server = ns.args[0];

  if (typeof server !== "string") {
    ns.tprint("arg[0] is not of type string!");
    return;
  }

  await primeServer(ns, server);
  await hackTarget(ns, server);
}
