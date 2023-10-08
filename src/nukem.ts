import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";
// list of the file names for port opening programs.
const portOpenerFiles = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject"];

/** Searchs the home server for all owned port opening executable files. */
function getOwnedPortOpenerFiles(ns: NS) {
  const filesOwned = [];
  for (const file of portOpenerFiles) {
    if (ns.fileExists(file, "home")) {
      filesOwned.push(file);
    }
  }
  return filesOwned;
}

/** Opens a port on the server using one of the programs in the portOpenerFiles array.
 * @param {string} server Name of the server.
 * @param {string} program A string matching one of the items in the portOpenerFiles array.
 */
function openPort(ns: NS, server: string, program: string) {
  switch (program) {
    case "BruteSSH.exe":
      ns.brutessh(server);
      break;
    case "FTPCrack.exe":
      ns.ftpcrack(server);
      break;
    case "relaySMTP.exe":
      ns.relaysmtp(server);
      break;
    case "HTTPWorm.exe":
      ns.httpworm(server);
      break;
    case "SQLInject.exe":
      ns.sqlinject(server);
      break;
  }
}

function openPorts(ns: NS, server: string, portOpeners: string[]) {
  if (ns.hasRootAccess(server)) return;
  const portsToOpen = ns.getServerNumPortsRequired(server);

  if (portsToOpen <= portOpeners.length) {
    for (let i = 0; i < portsToOpen; i++) {
      openPort(ns, server, portOpeners[i]);
    }
    ns.nuke(server);
    ns.tprint(`Root access gained on: ${server}`);
  }
}

/** Attempts to gain root access to all servers at a given depth. */
export async function main(ns: NS) {
  const depth = 5;
  const portOpeners = getOwnedPortOpenerFiles(ns);

  const callback = (ns: NS, serverName: string) => openPorts(ns, serverName, portOpeners);

  await forEachServer(ns, callback, {
    includeHomeServer: false,
    includePurchasedServers: false,
    UnownedServers: {include: true, hops: depth},
    rootAccessOnly: false,
  });
}
