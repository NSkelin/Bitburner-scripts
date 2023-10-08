import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";

/** Copies and executes the hack file on all servers with root access at depth from the current server */
export async function main(ns: NS) {
  const scripts = ["minHacker.js", "minGrower.js", "minWeakener.js", "primeServer.js", "primeServersForHack.js"];

  // ns.killall()

  const callback = (ns: NS, serverName: string) => {
    for (const script of scripts) {
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
