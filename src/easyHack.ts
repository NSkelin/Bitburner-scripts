import {NS} from "@ns";

/** optimizes a server with weaken and grow before hacking it. */
export async function main(ns: NS) {
  const [threadCount, target, maxMoney, minSecurity] = ns.args;

  if (typeof threadCount !== "number") {
    ns.tprint("args[0] is not a number!");
    return;
  } else if (typeof target !== "string") {
    ns.tprint("args[1] is not a string!");
    return;
  } else if (typeof maxMoney !== "number") {
    ns.tprint("args[2] is not a number!");
    return;
  } else if (typeof minSecurity !== "number") {
    ns.tprint("args[3] is not a number!");
    return;
  }

  while (true) {
    if (ns.getServerSecurityLevel(target) > minSecurity + 0.05 * threadCount) {
      await ns.weaken(target);
    }
    if (ns.getServerMoneyAvailable(target) < maxMoney) {
      await ns.grow(target);
    }
    await ns.hack(target);
  }
}
