import {NS} from "@ns";
import {getHackStage} from "./lib/hackerUtils";
import {forEachServer} from "./lib/helpers";
import {createProgressBar, sortTable, tprintTable} from "./lib/logger";

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
