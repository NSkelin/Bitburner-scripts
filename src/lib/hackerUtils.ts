import {NS} from "@ns";
import {forEachServer} from "lib/helpers";

/** Returns a summary of the scripts that best represents each targets current hack stage.
 *
 * A targets hack stage goes in this order: 1. Hack, 2: Grow, 3: Weaken, 4: Deploying, 5: Null. For each target only the
 * scripts related to the highest order will be kept.
 * Example: Target: n00dles. Scripts targeting n00dles: hack.js, weaken.js, deploy.js. Stage: "hack". Saved scripts: hack.js.
 *
 * It will search through the "home" and purchased servers for any running scripts that are related to hacking.
 * Each target will have the most relevant (see above) script and the total thread count for all instances of that script with the same target.
 */
export async function getHackStage(ns: NS) {
  const stageMap = new Map<string, {script: string; threads: number}>();
  // ORDER MATTERS. The lower the index, the higher the stage.
  const hackingScripts = ["minRunners/minHack.js", "minRunners/minGrow.js", "minRunners/minWeaken.js", "hackServer.js"];

  const callBack = (ns: NS, serverName: string) => {
    for (const {filename, args, threads} of ns.ps(serverName)) {
      // Incorrect script.
      if (!hackingScripts.includes(filename)) continue;
      const target = args[0];
      // Args[0] cant be a target server name.
      if (typeof target !== "string") continue;

      const {threads: threadCount, script} = stageMap.get(target) ?? {threads: 0, script: null};

      // Create a new stage for targets not in the map yet / higher order stage found.
      if (script == null || hackingScripts.indexOf(filename) < hackingScripts.indexOf(script)) {
        stageMap.set(target, {script: filename, threads: threads});
      } else if (filename === script) {
        // Update thread count.
        stageMap.set(target, {script: filename, threads: threads + threadCount});
      }
    }
  };

  // Get each servers hack status.
  await forEachServer(ns, callBack, {includeHomeServer: true, includePurchasedServers: true});

  return stageMap;
}

/** Returns true if the server's available money is at its maximum amount. */
export function serverMoneyAtMax(ns: NS, server: string) {
  return ns.getServerMaxMoney(server) === ns.getServerMoneyAvailable(server);
}

/** Returns true if the server's security is at its minimum level. */
export function serverSecurityAtMinimum(ns: NS, server: string) {
  return ns.getServerSecurityLevel(server) === ns.getServerMinSecurityLevel(server);
}

/** Returns true if the server is primed for hacking. (Has max money && min security) */
export function serverPrimed(ns: NS, server: string) {
  return serverMoneyAtMax(ns, server) && serverSecurityAtMinimum(ns, server);
}

/** Calculates the growth multiplier needed to return the amount of money taken from the server.
 * @param targetMoney - The money the target server has.
 * @param hackPercent - The percent of money taken from the server.
 * @returns The growth multiplier.
 */
function calculateGrowthMultiplier(targetMoney: number, hackPercent: number): number {
  let hackedMoney = targetMoney * hackPercent;
  if (hackedMoney >= targetMoney) {
    // A hack cannot take more money than the server has so set it to equal. However, the Grow function adds + $1 each time so it never tries to multiply by 0.
    // So we remove $1 from hackedMoney for the next formula, even though technically hackedMoney does have that extra $1.
    hackedMoney = targetMoney - 1;
  }

  // Assuming the targetRemainingMoney is the minimum of $1, this results in a $1 shortage. However because the Grow function adds $1 each time this ends up being fine.
  const targetRemainingMoney = targetMoney - hackedMoney;
  return hackedMoney / targetRemainingMoney + 1;
}

/** Adjust the second processs's threads to balance the speed difference between the frist and second processes.
 * @param process1Time The time taken by the first process.
 * @param process2Time The time taken by the second process.
 * @param process2Threads The initial number of processing threads.
 * @returns The adjusted number of processing threads round up to the nearest int.
 */
function balanceProcessingThreads(process1Time: number, process2Time: number, process2Threads: number) {
  if (process1Time === 0 || process2Time === 0) {
    throw new Error("Process times must be non-zero positive numbers.");
  }
  const speedDifferenceRatio = Math.max(process1Time, process2Time) / Math.min(process1Time, process2Time);

  if (process2Time < process1Time) {
    // The second process is faster, so decrease the thread count.
    process2Threads /= speedDifferenceRatio;
  } else if (process2Time > process1Time) {
    // The second process is slower, so increase the thread count.
    process2Threads *= speedDifferenceRatio;
  }

  // Ensure the thread count is an integer by rounding up and allowing for a little extra.
  return Math.ceil(process2Threads);
}

/** Returns the optimal amount of threads required for each step in the hacking processes (hack, grow, weaken) to sustain a given profit ratio for a server.
 * @param target The name of the server to be hacked
 * @param profitRatio The desired percent of the targets max money to be made per hack cycle.
 *
 * Warning - This function assumes the server(s) running the processes have 1 core.
 *
 * Warning - This function cannot accurately calculate the exact time for each process (hack, grow, weaken) and therefore thread count without formulas unlocked
 * (also not implemented).
 * While calculating the execution time for each process it assumes the servers security level is the current security level,
 * not the security level after each step (hack, grow).
 */
export function getOptimalHackingThreads(ns: NS, target: string, profitRatio = 0.1) {
  const targetMaxMoney = ns.getServerMaxMoney(target);

  // Server cant have money, meaning they cannot be hacked, so exit early.
  if (targetMaxMoney === 0) return {hackThreads: 0, growthThreads: 0, weakenThreads: 0};
  // Player cannot hack server, so exit early.
  else if (ns.getServerRequiredHackingLevel(target) > ns.getHackingLevel()) return {hackThreads: 0, growthThreads: 0, weakenThreads: 0};

  const hackPercent = ns.hackAnalyze(target);

  // get threads required to steal the profitRatio
  // threads must be integers so round up and hack a little extra instead of a little less
  const hackThreads = Math.ceil(profitRatio / hackPercent);

  // get the growth multiplier
  const growthMultiplier = calculateGrowthMultiplier(targetMaxMoney, hackPercent * hackThreads);
  let growthThreads = ns.growthAnalyze(target, growthMultiplier);

  // adjust growth threads to match speed differences
  const hackTime = ns.getHackTime(target);
  const growthTime = ns.getGrowTime(target);
  growthThreads = balanceProcessingThreads(hackTime, growthTime, growthThreads);

  // Get the amount of threads required to keep security to a minimum
  const hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreads, target);
  const growthSecurityIncrease = ns.growthAnalyzeSecurity(growthThreads, target);
  const baseSecurityDecrease = ns.weakenAnalyze(1);
  let weakenThreads = (hackSecurityIncrease + growthSecurityIncrease) / baseSecurityDecrease;

  // adjust weaken threads to match speed differences
  const weakenTime = ns.getWeakenTime(target);
  weakenThreads = balanceProcessingThreads(hackTime, weakenTime, weakenThreads);

  return {hackThreads, growthThreads, weakenThreads};
}
