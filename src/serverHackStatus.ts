import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";
import {createProgressBar, sortTable, tprintTable} from "./lib/logger";

/** Counts the amount of threads allocated to each stage of the server hacking process (hack, grow, weaken).
 * This is done for each server that can be hacked. */
async function getHackThreads(ns: NS) {
  const status = new Map<string, {hackThreads: number; growThreads: number; weakenThreads: number}>();
  await forEachServer(
    ns,
    (ns, serverName) => {
      for (const script of ns.ps(serverName)) {
        const filename = script.filename;
        const target = script.args[0];

        if (typeof target !== "string") continue;

        // Create an entry in map if it doesnt exist.
        if (status.get(target) == null) status.set(target, {hackThreads: 0, growThreads: 0, weakenThreads: 0});

        const threads = status.get(target)!;

        if (filename === "minRunners/minHack.js") {
          status.set(target, {...threads, hackThreads: threads.hackThreads + script.threads});
        } else if (filename === "minRunners/minGrow.js") {
          status.set(target, {...threads, growThreads: threads.growThreads + script.threads});
        } else if (filename === "minRunners/minWeaken.js") {
          status.set(target, {...threads, weakenThreads: threads.weakenThreads + script.threads});
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
  const tableHeaders = ["Server Name", "Status", "H", "G", "W", "Money", "Max Money", "Security", "Root Access", "Ports", "RAM", "Hack Skill"];
  const serversHackThreads = await getHackThreads(ns);

  const createRow = (ns: NS, serverName: string) => {
    // server stats.
    const serverMoney = ns.getServerMoneyAvailable(serverName);
    const serverMaxMoney = ns.getServerMaxMoney(serverName);
    const serverSecurity = ns.getServerSecurityLevel(serverName);
    const serverMaxSecurity = 100; // according to ns.getServerSecurityLevel security "typically between 1 and 100".

    // create progress bars for easier table visuals.
    const moneyBar = createProgressBar((serverMoney / serverMaxMoney) * 100, 20);
    const securityBar = createProgressBar((serverSecurity / serverMaxSecurity) * 100);

    const hackThreads = serversHackThreads.get(serverName)?.hackThreads ?? 0;
    const growThreads = serversHackThreads.get(serverName)?.growThreads ?? 0;
    const weakenThreads = serversHackThreads.get(serverName)?.weakenThreads ?? 0;

    // assemble the table row for this server.
    const row = [
      serverName,
      hackThreads > 0 ? "Hacking" : growThreads > 0 ? "Growing" : weakenThreads > 0 ? "Weakening" : "NA",
      `${hackThreads}`,
      `${growThreads}`,
      `${weakenThreads}`,
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
