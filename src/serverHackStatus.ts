import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";
import {createProgressBar, tprintTable} from "./lib/logger";

/** Prints a table summary of all unowned servers to the terminal. */
export async function main(ns: NS) {
  const data: string[][] = [];
  const tableHeaders = ["Server Name", "Money", "Security", "Root access", "Ports", "RAM", "Hack skill"];

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
      `${moneyBar}`,
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

  data.sort((a, b) => (a[0] > b[0] ? 1 : -1));
  data.unshift(tableHeaders);

  tprintTable(ns, data, true);
}
