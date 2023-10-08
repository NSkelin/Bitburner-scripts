import {NS} from "@ns";
import {canAfford} from "./lib/helpers";

/** Goes through each hacknet node and attempts to upgrade each upgrade. */
async function upgradeNodes(ns: NS) {
  const ownedNodes = ns.hacknet.numNodes();
  for (let i = 0; i < ownedNodes; i++) {
    while (canAfford(ns, ns.hacknet.getLevelUpgradeCost(i, 1))) {
      ns.hacknet.upgradeLevel(i, 1);
      await ns.sleep(1);
    }

    while (canAfford(ns, ns.hacknet.getRamUpgradeCost(i, 1))) {
      ns.hacknet.upgradeRam(i, 1);
      await ns.sleep(1);
    }

    while (canAfford(ns, ns.hacknet.getCoreUpgradeCost(i, 1))) {
      ns.hacknet.upgradeCore(i, 1);
      await ns.sleep(1);
    }
  }
}

/** Attempts to buy a new hacknet node if the user has enough money and are not at max nodes. */
function buyNodes(ns: NS) {
  const ownedNodes = ns.hacknet.numNodes();
  const maxNodes = ns.hacknet.maxNumNodes();

  if (ownedNodes >= maxNodes) return;
  if (canAfford(ns, ns.hacknet.getPurchaseNodeCost())) {
    ns.hacknet.purchaseNode();
  }
}

/** Continuously purchases the cheapest hackent node / upgrade. */
export async function main(ns: NS) {
  while (true) {
    buyNodes(ns);
    await upgradeNodes(ns);
    // might allow me to calculate how much an upgrade will give me
    // requires creating formulas .exe
    // ns.tprint(ns.formulas.hacknetNodes.moneyGainRate(100,8,1))
    await ns.sleep(30);
  }
}
