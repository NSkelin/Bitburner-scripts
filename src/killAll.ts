import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";

/** Copies and executes the hack file on all servers with root access at depth from the current server */
export async function main(ns: NS) {
  const blacklist = ["buyServers.js", "improveHacknet.js"];
  const scripts = ns.ls("home", ".js");

  const callback = (ns: NS, serverName: string) => {
    for (const script of scripts) {
      if (blacklist.includes(script)) continue;
      ns.scriptKill(script, serverName);
    }
  };

  await forEachServer(ns, callback, {
    includeHomeServer: true,
    includePurchasedServers: true,
    UnownedServers: {
      include: true,
      hops: 3,
    },
    rootAccessOnly: false,
  });
}
