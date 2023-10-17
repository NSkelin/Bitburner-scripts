import {NS} from "@ns";
import {Script, allocateScripts} from "./lib/allocate";
import {forEachServer} from "./lib/helpers";

/** This function will prime a server for hacking by lowering its security to the minimum and
 * growing its available money to the maximum. */
async function primeServer(ns: NS, server: string) {
  const scripts: Script[] = [
    {script: "hackServer.js", threads: 1, args: [server], files: ["minRunners/minHack.js", "minRunners/minGrow.js", "minRunners/minWeaken.js"]},
  ];
  await allocateScripts(ns, scripts, {
    serverOptions: {includeHomeServer: true, includePurchasedServers: true, UnownedServers: {include: false}},
  });
}

/** This script primes all hackable servers upto X hops away into an ideal state for hacking.
 * The servers will be have their security weakend to the minimum level possible, and their
 * available money will be grown to its maximum amount possible. */
export async function main(ns: NS) {
  await forEachServer(ns, primeServer, {
    includeHomeServer: false,
    includePurchasedServers: false,
    rootAccessOnly: true,
    UnownedServers: {include: true, hops: 30},
  });
}
