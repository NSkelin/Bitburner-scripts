import {NS} from "@ns";
import type {forEachServerOptions} from "./lib/helpers";
import {executeMaxThreads, forEachServer} from "./lib/helpers";

/** Runs the hacking script on the host with the maximum threads it can handle. Also includes some extra information for the hacking script as args. */
function startHack(ns: NS, script: string, host: string, target: string) {
  const maxMoney = ns.getServerMaxMoney(target);
  const minSecurity = ns.getServerMinSecurityLevel(target);
  executeMaxThreads(ns, script, host, [target, maxMoney, minSecurity]);
}

/** Runs the hack script with the hardcoded options. */
export async function main(ns: NS) {
  const callback = (ns: NS, serverName: string) => {
    // Enter the targets server name or use the serverName variable to target each server
    const target = serverName; // examples: "harakiri-sushi", serverName, etc.
    const script = "easyHack.js";
    ns.scp(script, serverName);

    return startHack(ns, script, serverName, target);
  };

  const options: forEachServerOptions = {
    includeHomeServer: false,
    includePurchasedServers: false,
    UnownedServers: {
      include: true,
      hops: 2,
    },
    rootAccessOnly: true,
  };

  await forEachServer(ns, callback, options);
}
