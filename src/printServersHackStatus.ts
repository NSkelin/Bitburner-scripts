import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";
import {createProgressBar, sortTable, tprintTable} from "./lib/logger";

/** Returns a summary of the scripts that best represents each targets current hack stage.
 *
 * A targets hack stage goes in this order: 1. Hack, 2: Grow, 3: Weaken, 4: Deploying, 5: Null. For each target only the
 * scripts related to the highest order will be kept.
 * Example: Target: n00dles. Scripts targeting n00dles: hack.js, weaken.js, deploy.js. Stage: "hack". Saved scripts: hack.js.
 *
 * It will search through the "home" and purchased servers for any running scripts that are related to hacking.
 * Each target will have the most relevant (see above) script and the total thread count for all instances of that script with the same target.
 */
async function getHackStage(ns: NS) {
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

/** Prints a table summary of all unowned servers to the terminal. */
export async function main(ns: NS) {
  const data: string[][] = [];
  const tableHeaders = ["Server Name", "Status", "Threads", "Money", "Max Money", "Security", "Root Access", "Ports", "RAM", "Hack Skill"];
  const hackStages = await getHackStage(ns);

  const createRow = (ns: NS, serverName: string) => {
    // server stats.
    const serverMoney = ns.getServerMoneyAvailable(serverName);
    const serverMaxMoney = ns.getServerMaxMoney(serverName);
    const serverSecurity = ns.getServerSecurityLevel(serverName);
    const serverMaxSecurity = 100; // according to ns.getServerSecurityLevel security "typically between 1 and 100".

    // create progress bars for easier table visuals.
    const moneyBar = createProgressBar((serverMoney / serverMaxMoney) * 100, 20);
    const securityBar = createProgressBar((serverSecurity / serverMaxSecurity) * 100);
    const stage = hackStages.get(serverName)?.script;

    // assemble the table row for this server.
    const row = [
      serverName,
      stage === "hackServer.js"
        ? "Deploying"
        : stage === "minRunners/minHack.js"
        ? "Hacking"
        : stage === "minRunners/minGrow.js"
        ? "Growing"
        : stage === "minRunners/minWeaken.js"
        ? "Weakening"
        : "NA",
      `${hackStages.get(serverName)?.threads ?? 0}`,
      `${moneyBar}`,
      `${ns.formatNumber(ns.getServerMaxMoney(serverName))}`,
      `${securityBar}`,
      `${ns.hasRootAccess(serverName)}`,
      `${ns.getServerNumPortsRequired(serverName)}`,
      `${ns.getServerMaxRam(serverName)} GB`,
      `${ns.getServerRequiredHackingLevel(serverName)}`,
    ];

    data.push(row);
  };

  await forEachServer(ns, createRow, {
    includeHomeServer: false,
    includePurchasedServers: false,
    rootAccessOnly: false,
    UnownedServers: {include: true, hops: 10},
  });

  data.unshift(tableHeaders);

  if (typeof ns.args[0] === "string") {
    sortTable(ns, data, ns.args[0]);
  }

  tprintTable(ns, data, true);
}
