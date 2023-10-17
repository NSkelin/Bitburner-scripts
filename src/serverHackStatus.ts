import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";
import {createProgressBar, sortTable, tprintTable} from "./lib/logger";

async function getServerStatus(ns: NS) {
  const status = new Map<string, string>();
  await forEachServer(
    ns,
    (ns, serverName) => {
      for (const script of ns.ps(serverName)) {
        const filename = script.filename;
        const target = script.args[0];

        if (typeof target !== "string") continue;

        if (filename === "minRunners/minHack.js") {
          status.set(target, "Hacking");
        } else if (filename === "minRunners/minGrow.js" && status.get(target) !== "Hacking") {
          status.set(target, "Growing");
        } else if (filename === "minRunners/minWeaken.js" && status.get(target) !== "Hacking" && status.get(target) !== "Growing") {
          status.set(target, "Weakening");
        }
      }
    },
    {includeHomeServer: true, includePurchasedServers: true}
  );

  return status;
}

/** Prints a table summary of all unowned servers to the terminal. */
export async function main(ns: NS) {
  const data: string[][] = [];
  const tableHeaders = ["Server Name", "status", "Money", "Max Money", "Security", "Root access", "Ports", "RAM", "Hack skill"];
  const serverStatus = await getServerStatus(ns);

  const createRow = (ns: NS, serverName: string) => {
    // server stats.
    const serverMoney = ns.getServerMoneyAvailable(serverName);
    const serverMaxMoney = ns.getServerMaxMoney(serverName);
    const serverSecurity = ns.getServerSecurityLevel(serverName);
    const serverMaxSecurity = 100; // according to ns.getServerSecurityLevel security "typically between 1 and 100".

    // create progress bars for easier table visuals.
    const moneyBar = createProgressBar((serverMoney / serverMaxMoney) * 100, 20);
    const securityBar = createProgressBar((serverSecurity / serverMaxSecurity) * 100);

    // assemble the table row for this server.
    const row = [
      serverName,
      serverStatus.get(serverName) ?? "NA",
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
