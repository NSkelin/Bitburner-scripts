import {NS} from "@ns";

export interface forEachServerOptions {
  /** Should the iterator include the home server? */
  includeHomeServer?: boolean;
  /** Should the iterator include purchased servers? */
  includePurchasedServers?: boolean;
  /** Options for servers not owned by the player. */
  UnownedServers?: {
    /** Should the iterator include unowned servers? */
    include?: boolean;
    /** Starting at the home server, how many hops away should the search go for? */
    hops?: number;
  };
  /** Should the server have root access available? */
  rootAccessOnly?: boolean;
}

type a = (ns: NS, serverName: string) => Promise<void>;
type b = (ns: NS, serverName: string) => void;

/** This function will iterate through all servers and callback with each servers name.
 * Iteration starts at the home server and depends on the options sent in. */
export async function forEachServer(ns: NS, callback: a | b, options?: forEachServerOptions) {
  // get options
  const includeHomeServer = options?.includeHomeServer ?? false;
  const includePurchasedServers = options?.includePurchasedServers ?? false;
  const includeNotOwned = options?.UnownedServers?.include ?? false;
  const hops = options?.UnownedServers?.hops ?? 1;
  const rootAccessOnly = options?.rootAccessOnly ?? true;

  const purchasedServers = [...ns.getPurchasedServers()];

  if (hops > 0) await descendHopTree("home", hops);

  async function descendHopTree(activeServer: string, remainingHops: number, previousServer?: string) {
    // get servers 1 hop away
    const servers = ns.scan(activeServer);

    for (const serverName of servers) {
      // if the server is owned but the function isnt allowed to run on owned servers, skip it.
      if (includePurchasedServers === false && purchasedServers.includes(serverName)) continue;
      // if the server is not owned and the function isnt allowed to run on unowned servers, skip it.
      else if (includeNotOwned === false && purchasedServers.includes(serverName) === false) continue;
      // prevent hopping back up the tree if the previous server is this one.
      else if (typeof previousServer === "string" && serverName === previousServer) continue;
      // if the function can only run on servers with root access and this server doesnt have it, skip it.
      else if (rootAccessOnly && ns.hasRootAccess(serverName) === false) continue;

      await callback(ns, serverName);

      if (remainingHops > 1) {
        await descendHopTree(serverName, remainingHops - 1, activeServer);
      }
    }

    return;
  }

  // callback with the home server
  if (includeHomeServer === true) await callback(ns, "home");
}

/** Calculates the total money you require to afford the cost while only spending a portion of your funds. */
export function getInvestmentSize(cost: number, maxSpendPercent: number) {
  return cost / maxSpendPercent;
}

/** Checks if the user can afford the purchase cost.
 *
 * The optional parameter maxPercent (default 0.01) can be used to limit the maximum useable money. For example: if you have $1,000,000 with a limit of 0.05,
 * the max you can afford to spend is $50,000. */
export function canAfford(ns: NS, cost: number, maxPercent = 0.01) {
  const money = ns.getServerMoneyAvailable("home");
  const requiredInvestmentSize = getInvestmentSize(cost, maxPercent);

  return money >= requiredInvestmentSize;
}

/** Executes a script from the home server onto the host server with the max possible threads the host can handle.
 * @param script The name of the script to run.
 * @param host The name of the server to run the script on.
 * @param args An array of arguments you wish to pass onto the script. Note that the first arg is always the thread count the script is ran with.
 */
export function executeMaxThreads(ns: NS, script: string, host: string, args: (string | number | boolean)[]) {
  const ram = ns.getServerMaxRam(host);
  const cost = ns.getScriptRam(script);
  const threads = Math.floor(ram / cost);

  if (threads > 0) {
    ns.exec(script, host, threads, threads, ...args);
  }
}

/** Gets the free RAM (MB) available for use a server.
 * @param {string} host The name of the target server.
 */
export function getServerFreeRam(ns: NS, host: string) {
  return ns.getServerMaxRam(host) * 1000 - ns.getServerUsedRam(host) * 1000;
}
