import {NS} from "@ns";
import {canAfford, getInvestmentSize} from "./lib/helpers";

/** A helper function to print useful info into the servers log to help me understand the scripts status. */
function printPurchaseStatus(ns: NS, cost: number, percent: number) {
  const serverLimit = ns.getPurchasedServerLimit();
  const availableServersToBuy = getPurchasableServerCount(ns);
  const ownedServers = serverLimit - availableServersToBuy;
  const realCost = getInvestmentSize(cost, percent);

  ns.print("|");
  ns.print("----------------------------------------");
  ns.print("Purchasing servers...");
  ns.print(`Servers purchased: ${ownedServers} / ${serverLimit}`);
  ns.print(`Next purchase cost: ${ns.formatNumber(cost)} / ${ns.formatNumber(realCost)} (purchase cost / investment size)`);
  ns.print("----------------------------------------");
  ns.print("|");
}

/** A helper function to print useful info into the servers log to help me understand the scripts status. */
function printUpgradeStatus(ns: NS, baseRam: number, maxRam: number, server: string, serverIteration: number, percent: number) {
  const upgradeCost = getRamDoubleCost(ns, server);
  const investmentSize = getInvestmentSize(upgradeCost, percent);

  ns.print("|");
  ns.print("----------------------------------------");
  ns.print("Upgrading servers...");
  ns.print(`Current RAM: ${baseRam} / ${maxRam} (Base RAM / Max base RAM)`);
  ns.print(`Next base ram upgrade cost: ${ns.formatNumber(upgradeCost)} / ${ns.formatNumber(investmentSize)} (upgrade cost / investment size)`);
  ns.print(`Servers upgraded: ${serverIteration} / ${ns.getPurchasedServers().length}`);
  ns.print("----------------------------------------");
  ns.print("|");
}

/** Returns the number of servers that can still be purchased. */
function getPurchasableServerCount(ns: NS) {
  return ns.getPurchasedServerLimit() - ns.getPurchasedServers().length;
}

/** Calculate the cost to double a servers ram. */
function getRamDoubleCost(ns: NS, server: string) {
  const maxRam = ns.getServerMaxRam(server);
  return ns.getPurchasedServerUpgradeCost(server, maxRam * 2);
}

/** Upgrades a server to double its current max ram.
 *
 * Waits until you have 10x the cost of upgrading the server before doubling its ram. */
async function doubleRam(ns: NS, server: string, costPercent: number) {
  const maxRam = ns.getServerMaxRam(server);
  const upgradeCost = getRamDoubleCost(ns, server);
  while (canAfford(ns, upgradeCost, costPercent) === false) {
    await ns.sleep(60 * 1000);
  }
  ns.upgradePurchasedServer(server, maxRam * 2);
}

/** Purchases servers until the maximum number of servers possible is reached.
 *
 * If you run out of money, it will wait until you have enough (10x the cost) before continuing to purchase servers. */
async function purchaseAllServers(ns: NS, hostName: string, startRam: number, costPercent: number) {
  const availableServersToBuy = getPurchasableServerCount(ns);

  for (let i = 0; i < availableServersToBuy; i++) {
    const cost = ns.getPurchasedServerCost(startRam);
    printPurchaseStatus(ns, cost, costPercent);
    while (canAfford(ns, cost, costPercent) === false) {
      await ns.sleep(60 * 1000);
    }
    ns.purchaseServer(hostName, startRam);
  }
}

/** Upgrades all owned server's ram by double each time until the maximum ram is reached on them all.
 *
 * It will upgrade all servers to an equal base before upgrading past it (8gb, 8gb, 8gb, instead of 16gb, 8gb, 4gb).
 * It also waits until you have 10x the required server cost before upgrading.
 */
async function upgradeAllServers(ns: NS, costPercent: number, maxRam: number) {
  maxRam = maxRam ?? ns.getPurchasedServerMaxRam();
  if (Math.log2(maxRam) % 1 !== 0) throw new Error("Max ram MUST be a multiple of 2");

  // get the lowest base ram level of all servers
  let baseRam = 0;
  for (const server of ns.getPurchasedServers()) {
    const maxRam = ns.getServerMaxRam(server);
    if (baseRam === 0 || maxRam < baseRam) {
      baseRam = maxRam;
    }
  }

  while (baseRam < maxRam) {
    for (const [i, server] of ns.getPurchasedServers().entries()) {
      printUpgradeStatus(ns, baseRam, maxRam, server, i, costPercent);

      if (ns.getServerMaxRam(server) === baseRam) {
        await doubleRam(ns, server, costPercent);
      }
    }
    baseRam *= 2;
  }
}

/** This script will continuously purchase and upgrade servers until you own the maximum amount possible, each upgraded to the maximum ram possible. */
export async function main(ns: NS) {
  const newServerHostName = "home-S"; // The base name scheme for new servers. automatically adds digits, ex: home-S-0, home-S-1, etc.
  const newServerRam = 8; // The amount of ram new servers should be purchased with.
  const costPercent = 0.1; // The maximum percent of your total money you are willing to pay to purchase / upgrade servers.
  const maxRam = 2048; // multiples of 2 only.

  await purchaseAllServers(ns, newServerHostName, newServerRam, costPercent);
  await upgradeAllServers(ns, costPercent, maxRam);
}
