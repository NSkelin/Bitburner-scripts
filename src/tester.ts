import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";

export async function main(ns: NS) {
  await testForEachServer(ns);
}

async function testForEachServer(ns: NS) {
  const servers: string[] = [];
  await forEachServer(ns, (ns, serverName) => servers.push(serverName), {
    includeHomeServer: true,
    includePurchasedServers: true,
    rootAccessOnly: false,
    UnownedServers: {include: true, hops: 3},
  });
  if (new Set(servers).size < servers.length) {
    ns.print(`Error, duplicates found`);
  } else {
    ns.print(`Success, no duplicates found`);
  }
}
