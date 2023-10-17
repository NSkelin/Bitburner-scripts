import {NS} from "@ns";

/** An incredibly cheap server security lower meant to be controlled by another script. */
export async function main(ns: NS) {
  const server = ns.args[0];

  if (typeof server !== "string") {
    ns.tprint("arg[0] is not of type string!");
    return;
  }

  while (true) {
    await ns.weaken(server);
  }
}
