import {NS} from "@ns";

/** Returns true if the server's available money is at its maximum amount. */
export function serverMoneyAtMax(ns: NS, server: string) {
  return ns.getServerMaxMoney(server) === ns.getServerMoneyAvailable(server);
}

/** Returns true if the server's security is at its minimum level. */
export function serverSecurityAtMinimum(ns: NS, server: string) {
  return ns.getServerSecurityLevel(server) === ns.getServerMinSecurityLevel(server);
}

/** Returns true if the server is primed for hacking. (Has max money && min security) */
export function serverPrimed(ns: NS, server: string) {
  return serverMoneyAtMax(ns, server) && serverSecurityAtMinimum(ns, server);
}
