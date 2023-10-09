import {NS} from "@ns";
import {allocateScripts} from "./lib/allocate";
import {getOptimalHackingThreads, serverPrimed, serverSecurityAtMinimum} from "./lib/hackerUtils";
/** Lowers a servers security to its minimum level possible.
 *
 * Runs a script on the server to lower its security to the minimum value possible, then stops the script and returns.
 */
async function weakenSecurityToMinimum(ns: NS, server: string) {
  // get security to minimum
  if (serverSecurityAtMinimum(ns, server) === true) return;

  const securityLevelLeft = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server);
  let threadCount = 1;
  while (securityLevelLeft > ns.weakenAnalyze(threadCount)) {
    threadCount++;
  }

  const scriptPids = await allocateScripts(ns, [{script: "minWeakener.js", threads: threadCount, args: [server]}], {
    serverOptions: {includeHomeServer: true},
    executeOptions: {allowThreadSplitting: true},
  });

  if (scriptPids == null || scriptPids.length === 0) {
    ns.tprint(`FAILED TO ALLOCATE minWeakener.js SCRIPT(S) FOR ${server}. THREADS: ${threadCount}`);
    return;
  }

  // wait till done
  while (serverSecurityAtMinimum(ns, server) === false) {
    await ns.sleep(5000);
  }

  for (const {pid} of scriptPids) {
    ns.kill(pid);
  }

  return;
}

async function growMoneyToMaximum(ns: NS, server: string) {
  // do calc
  const {growthThreads, weakenThreads} = getOptimalHackingThreads(ns, server, 0.1);

  // grow to max & keep security at minimum
  const scripts = [
    {script: "minGrower.js", threads: growthThreads, args: [server]},
    {script: "minWeakener.js", threads: weakenThreads, args: [server]},
  ];

  const scriptPids = await allocateScripts(ns, scripts, {serverOptions: {includeHomeServer: true}, executeOptions: {allowThreadSplitting: true}});

  if (scriptPids == null || scriptPids.length === 0) {
    ns.tprint(`FAILED TO ALLOCATE minWeakener.js & minGrower.js SCRIPT(S) FOR ${server}.`);
    return;
  }

  // wait till done
  while (serverSecurityAtMinimum(ns, server) === false) {
    await ns.sleep(5000);
  }

  for (const {pid} of scriptPids) {
    ns.kill(pid);
  }

  return;
}

async function hackTarget(ns: NS, target: string) {
  const {hackThreads, growthThreads, weakenThreads} = getOptimalHackingThreads(ns, target, 0.1);
  if (hackThreads === 0 || growthThreads === 0 || weakenThreads === 0) return;
  const scripts = [
    {script: "minHacker.js", threads: hackThreads, args: [target]},
    {script: "minGrower.js", threads: growthThreads, args: [target]},
    {script: "minWeakener.js", threads: weakenThreads, args: [target]},
  ];

  await allocateScripts(ns, scripts, {
    serverOptions: {
      includeHomeServer: true,
      includePurchasedServers: true,
      UnownedServers: {
        include: false,
      },
    },
    executeOptions: {allOrNothing: true, sameServer: true},
  });
  return;
}

/** This function will prime a server for hacking by lowering its security to the minimum and
 * growing its available money to the maximum. */
async function primeServer(ns: NS, server: string) {
  if (serverPrimed(ns, server)) return; // servers ready to go so theres nothing to do

  await weakenSecurityToMinimum(ns, server);
  await growMoneyToMaximum(ns, server);
  await weakenSecurityToMinimum(ns, server); // redo to ensure security is minimum.
  await hackTarget(ns, server);
}

/** An incredibly cheap server security lower meant to be controlled by another script. */
export async function main(ns: NS) {
  const server = ns.args[0];

  if (typeof server !== "string") {
    ns.tprint("arg[0] is not of type string!");
    return;
  }

  await primeServer(ns, server);
}
