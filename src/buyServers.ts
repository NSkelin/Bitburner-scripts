import {NS} from "@ns";
import {canAfford, getInvestmentSize} from "./lib/helpers";
import {printMenu} from "./lib/logger";

/** A helper function to print useful info into the servers log to help me understand the scripts status. */
function printPurchaseStatus(ns: NS, cost: number, percent: number) {
  const serverLimit = ns.getPurchasedServerLimit();
  const availableServersToBuy = getPurchasableServerCount(ns);
  const ownedServers = serverLimit - availableServersToBuy;
  const realCost = getInvestmentSize(cost, percent);

  const menuData = [
    ["Servers owned", `${ownedServers} / ${serverLimit}`],
    ["Server cost", `${ns.formatNumber(cost)} / ${ns.formatNumber(realCost)}`],
  ];

  printMenu(ns, "buyServers.js", "Purchasing servers...", menuData);
}

/** A helper function to print useful info into the servers log to help me understand the scripts status. */
function printUpgradeStatus(ns: NS, baseRam: number, maxRam: number, server: string, serverIteration: number, percent: number) {
  const upgradeCost = getRamDoubleCost(ns, server);
  const investmentSize = getInvestmentSize(upgradeCost, percent);

  const menuData = [
    ["Servers owned", "25/25"],
    ["Server cost", "NA / NA"],
    ["", ""],
    ["Current RAM", `${ns.formatRam(baseRam)} / ${ns.formatRam(maxRam)}`],
    ["RAM double cost", `${ns.formatNumber(upgradeCost)} / ${ns.formatNumber(investmentSize)}`],
    ["Servers doubled", `${serverIteration} / ${ns.getPurchasedServers().length}`],
  ];

  printMenu(ns, "buyServers.js", "Doubling RAM...", menuData);
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

/** Goes through each purchased server one by one and doubles their RAM each time until they all are at the desired RAM amount.
 *
 * @param spendPercent Defines the percent of your total money you are willing to spend. ex: upgrade cost: 100, cost percent 0.1 (10%), money required: 1000.
 * @param desiredRam [Default: Max allowed] The amount of RAM, in GB, to upgrade the server to. Must be a power of 2 and will be capped at the max RAM possible.
 */
async function incrementallyUpgradeServers(ns: NS, spendPercent: number, desiredRam = ns.getPurchasedServerMaxRam()) {
  // Cap desired RAM to the maximum RAM possible.
  desiredRam = desiredRam > ns.getPurchasedServerMaxRam() ? ns.getPurchasedServerMaxRam() : desiredRam;
  // Ensure desiredRam is a power of 2.
  if (Math.log2(desiredRam) % 1 !== 0) throw new Error("Max RAM MUST be a power of 2.");

  // Get the smallest RAM level across all purchased servers.
  let baseRam = 0;
  for (const server of ns.getPurchasedServers()) {
    const currentRam = ns.getServerMaxRam(server);
    if (baseRam === 0 || currentRam < baseRam) {
      baseRam = currentRam;
    }
  }

  // Increment each servers RAM.
  while (baseRam < desiredRam) {
    for (const [i, server] of ns.getPurchasedServers().entries()) {
      printUpgradeStatus(ns, baseRam, desiredRam, server, i, spendPercent);
      await increaseServerRam(ns, server, baseRam * 2, 0.1);
    }
    baseRam *= 2;
  }
}

/** Upgrades a purchased servers RAM to the desired amount. If you do not have enough money it waits until you do.
 *
 * @param server The name of the purchased server to increase the RAM of.
 * @param desiredRam The amount of RAM, in GB, to upgrade the server to. Must be a power of 2 and will be capped at the max RAM possible.
 * @param spendPercent Defines the percent of your total money you are willing to spend. ex: upgrade cost: 100, cost percent 0.1 (10%), money required: 1000.
 * @param multiplier [Default: 1] Must be 1 or a power of 2. If 1, the server will be upgraded to the desired RAM all at once,
 * otherwise it will be multiplied by the multiplier until the desired RAM is reached.
 */
async function increaseServerRam(ns: NS, server: string, desiredRam: number, spendPercent: number, multiplier = 1) {
  // Cap desired RAM to the maximum RAM possible.
  desiredRam = desiredRam > ns.getPurchasedServerMaxRam() ? ns.getPurchasedServerMaxRam() : desiredRam;
  // Ensure desiredRam is a power of 2.
  if (Math.log2(desiredRam) % 1 !== 0) throw new Error("desired RAM MUST be a power of 2.");
  // Ensure multiplier is 1 or a power of 2.
  if (multiplier !== 1 && Math.log2(multiplier) % 1 !== 0) throw new Error(`Multiplier MUST be 1 OR a multiple of 2. Was: ${multiplier}`);

  while (ns.getServerMaxRam(server) < desiredRam) {
    const currentRam = ns.getServerMaxRam(server);
    // set the target RAM to the desired RAM if the multiplier is 1, otherwise multiply the current RAM by the multiplier, capped at the maximum RAM possible.
    const targetRam =
      multiplier === 1
        ? desiredRam
        : currentRam * multiplier > ns.getPurchasedServerMaxRam()
        ? ns.getPurchasedServerMaxRam()
        : currentRam * multiplier;

    const upgradeCost = ns.getPurchasedServerUpgradeCost(server, targetRam);

    // Wait until the upgrade can be bought.
    while (canAfford(ns, upgradeCost, spendPercent) === false) {
      await ns.sleep(30 * 1000);
    }

    ns.upgradePurchasedServer(server, targetRam);
  }
}

/** Continuously purchases a new server and upgrades its RAM to the desired amount until the maximum number of servers possible is reached.
 *
 * @param hostName Name for the newly purchased server.
 * @param initialRam The RAM that a new server will be purchased with. Capped at the max RAM possible.
 * @param desiredRam [Default: 256] The amount of RAM, in GB, to upgrade the server to. Must be a power of 2 and will be capped at the max RAM possible.
 * @param spendPercent [Default: 1] Defines the percent of your total money you are willing to spend. ex: upgrade cost: 100, cost percent 0.1 (10%), money required: 1000.
 * @param multiplier [Default: 2] Must be 1 or a power of 2. If 1, the server will be upgraded to the desired RAM all at once,
 * otherwise it will be multiplied by the multiplier until the desired RAM is reached.
 */
async function purchaseAllServers(ns: NS, hostName: string, initialRam: number, spendPercent = 1) {
  // Cap desired RAM to the maximum RAM possible.
  initialRam = initialRam > ns.getPurchasedServerMaxRam() ? ns.getPurchasedServerMaxRam() : initialRam;

  // Purchase new servers until cap is reached.
  while (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
    const cost = ns.getPurchasedServerCost(initialRam);
    printPurchaseStatus(ns, cost, spendPercent);
    if (canAfford(ns, cost, spendPercent)) {
      ns.purchaseServer(hostName, initialRam);
    } else {
      await ns.sleep(30 * 1000);
    }
  }
}

/** This script will continuously purchase and upgrade servers until you own the maximum amount possible, each upgraded to the maximum ram possible. */
export async function main(ns: NS) {
  ns.disableLog("ALL");
  const newServerHostName = "home-S"; // The base name scheme for new servers. automatically adds digits, ex: home-S-0, home-S-1, etc.
  const newServerRam = 64; // The amount of ram new servers should be purchased with.
  const spendPercent = 0.1; // The maximum percent of your total money you are willing to pay to upgrade servers.
  const desiredRam = 16384; // multiples of 2 only.

  await purchaseAllServers(ns, newServerHostName, newServerRam);
  await incrementallyUpgradeServers(ns, spendPercent, desiredRam);
}
