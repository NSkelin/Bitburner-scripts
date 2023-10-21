import {NS} from "@ns";
import {AllocateScriptsOptions, allocateScripts} from "./lib/allocate";
import {getOptimalHackingThreads, serverMoneyAtMax, serverSecurityAtMinimum} from "./lib/hackerUtils";
import {printMenu} from "./lib/logger";

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

function printScriptStatus(ns: NS, status: string, timeLeft: number) {
  const menuData = [
    ["Status", `${status}`],
    ["Time left", `${timeLeft}`],
    ["Hack Profit", ``],
    ["Security level", `2 / 1`],
  ];

  printMenu(ns, "HackServer.js", "Hacking server...", menuData);
}

async function countDown(ns: NS, time: number, interval = 300, callBack?: (ns: NS, timeLeft: number) => void) {
  while (time > 0) {
    await ns.sleep(interval);
    time -= interval;
    if (callBack) callBack(ns, time);
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
  const scriptPids = await allocateScripts(ns, [{script: "minRunners/minWeaken.js", threads: threadCount, args: [server, false]}], allocationOptions);
  if (scriptPids == null || scriptPids.length === 0) return;
}

/** Grows the target servers money to its maximum possible amount while keeping the security to a minimum.
 *
 * Calculates the threads required to grow the servers money by 10%, then runs as many threads as possible.
 * Once the servers money is at its maximum the grower script(s) are automatically stopped.
 * @param server The server to grow money on.
 */
async function growMoneyToMaximum(ns: NS, server: string) {
  // Server money already max, exit early.
  if (serverMoneyAtMax(ns, server) === true) return;

  // Get growth threads.
  const maxMoney = ns.getServerMaxMoney(server);
  const money = ns.getServerMoneyAvailable(server);
  const multiplier = maxMoney / money;
  const growthThreads = Math.ceil(ns.growthAnalyze(server, multiplier));

  // Try to start grower scripts.
  const scripts = [{script: "minRunners/minGrow.js", threads: growthThreads, args: [server, false]}];
  const scriptPids = await allocateScripts(ns, scripts, allocationOptions);
  if (scriptPids == null || scriptPids.length === 0) return;
}

/** Continously hacks the target server for 10% of its money while maintaining its money at maximum and security at minimum.
 * @param target The server to be hacked.
 */
async function hackTarget(ns: NS, target: string) {
  const {hackThreads} = getOptimalHackingThreads(ns, target, 0.2);
  if (hackThreads === 0) return;

  // Try to start hacking scripts.
  const scripts = [{script: "minRunners/minHack.js", threads: hackThreads, args: [target, false]}];
  const scriptPids = await allocateScripts(ns, scripts, {...allocationOptions, executeOptions: {allOrNothing: true}});
  if (scriptPids == null || scriptPids.length === 0) return;
}

async function primeServer(ns: NS, target: string) {
  while (true) {
    const security = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);
    const money = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);

    const maxTime = 20 * 60 * 1000; // 20 minutes
    if ((ns.getWeakenTime(target) > maxTime, ns.getGrowTime(target) > maxTime, ns.getGrowTime(target) > maxTime)) return;
    else if (ns.getServerMaxMoney(target) === 0) return;

    if (security > minSec) {
      await weakenSecurityToMinimum(ns, target);
      await countDown(ns, ns.getWeakenTime(target), 300, (ns, timeLeft) => printScriptStatus(ns, "Weakening", timeLeft));
    } else if (money < maxMoney) {
      await growMoneyToMaximum(ns, target);
      await countDown(ns, ns.getGrowTime(target), 300, (ns, timeLeft) => printScriptStatus(ns, "Growing", timeLeft));
    } else {
      await hackTarget(ns, target);
      await countDown(ns, ns.getHackTime(target), 300, (ns, timeLeft) => printScriptStatus(ns, "Hacking", timeLeft));
    }

    // Safety wait.
    await ns.sleep(500);
  }
}

/** Prepares a server for hacking, then hacks it. */
export async function main(ns: NS) {
  ns.disableLog("ALL");
  const server = ns.args[0];

  if (typeof server !== "string") {
    ns.tprint("arg[0] is not of type string!");
    return;
  }

  // printScriptStatus(ns);
  await primeServer(ns, server);
  await hackTarget(ns, server);
}
