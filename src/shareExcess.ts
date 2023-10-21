import {NS} from "@ns";
import {allocateScripts} from "./lib/allocate";

export async function main(ns: NS) {
  await allocateScripts(ns, [{script: "minRunners/minShare.js", threads: 10000}], {
    executeOptions: {allOrNothing: false, allowThreadSplitting: true, sameServer: false},
    serverOptions: {includeHomeServer: false, includePurchasedServers: true},
  });

  ns.tprint(`Rep gain is being multiplied by: ${ns.formatNumber(ns.getSharePower())}.`);
}
