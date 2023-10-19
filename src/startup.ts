import {NS} from "@ns";

export async function main(ns: NS) {
  if (!ns.scriptRunning("improveHacknet.js", "home")) ns.run("improveHacknet.js");
  if (!ns.scriptRunning("buyServers.js", "home")) ns.run("buyServers.js");
  if (!ns.scriptRunning("nukem.js", "home")) ns.run("nukem.js");
  if (!ns.scriptRunning("hackAllServers.js", "home")) ns.run("hackAllServers.js");
}
