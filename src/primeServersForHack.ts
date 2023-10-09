import {NS} from "@ns";
import {allocateScripts} from "./lib/allocate";
import {getOptimalHackingThreads, serverMoneyAtMax, serverPrimed, serverSecurityAtMinimum} from "./lib/hackerUtils";
import {forEachServer} from "./lib/helpers";

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
    executeOptions: {allowThreadSplitting: true},
  });

  if (scriptPids == null || scriptPids.length === 0) {
    ns.tprint(`FAILED TO ALLOCATE minWeakener.js SCRIPT(S) FOR ${server}. THREADS: ${threadCount}`);
    return;
  }

  if (map.has(server)) {
    ns.tprint("err");
  }
  map.set(server, {goal: "weaken", pids: scriptPids.map(({pid}) => pid)});
}

async function growMoneyToMaximum(ns: NS, server: string) {
  // do calc
  const {growthThreads, weakenThreads} = getOptimalHackingThreads(ns, server, 0.1);

  // grow to max & keep security at minimum
  const scripts = [
    {script: "minGrower.js", threads: growthThreads, args: [server]},
    {script: "minWeakener.js", threads: weakenThreads, args: [server]},
  ];

  const scriptPids = await allocateScripts(ns, scripts, {executeOptions: {allowThreadSplitting: true}});

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

/** This function will prime a server for hacking by lowering its security to the minimum and
 * growing its available money to the maximum. */
async function primeServer(ns: NS, server: string) {
  if (serverPrimed(ns, server)) return; // servers ready to go so theres nothing to do

  await allocateScripts(ns, [{script: "hackServer.js", threads: 1, args: [server]}], {
    serverOptions: {includeHomeServer: true, includePurchasedServers: false, UnownedServers: {include: false}},
  });
}

function killPids(ns: NS, pids: number[]) {
  for (const pid of pids) {
    ns.kill(pid);
  }
}

interface Job {
  goal: "weaken" | "grow";
  pids: number[];
}
const map = new Map<string, Job>();

function primeServer2(ns: NS, server: string) {
  if (serverPrimed(ns, server)) return;

  // if the server has a job and its finished, end it. otherwise start priming the server for hacking
  const job = map.get(server);
  if (job != null && ((job.goal === "grow" && serverMoneyAtMax(ns, server)) || (job.goal === "weaken" && serverSecurityAtMinimum(ns, server)))) {
    endJob(ns, server, job);
  } else {
    startpriming(ns, server);
  }
}

function endJob(ns: NS, server: string, job: Job) {
  if ((job.goal === "grow" && serverMoneyAtMax(ns, server)) || (job.goal === "weaken" && serverSecurityAtMinimum(ns, server))) {
    killPids(ns, job.pids);
  }
}

function startpriming(ns: NS, server: string) {
  if (!serverSecurityAtMinimum(ns, server)) {
    weakenSecurityToMinimum(ns, server);
  } else if (!serverMoneyAtMax(ns, server)) {
    growMoneyToMaximum(ns, server);
  }
}

/** This script primes all hackable servers upto X hops away into an ideal state for hacking.
 * The servers will be have their security weakend to the minimum level possible, and their
 * available money will be grown to its maximum amount possible. */
export async function main(ns: NS) {
  await forEachServer(ns, primeServer, {
    includeHomeServer: false,
    includePurchasedServers: false,
    rootAccessOnly: true,
    UnownedServers: {include: true, hops: 4},
  });
}
