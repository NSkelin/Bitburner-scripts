import {NS} from "@ns";
import {forEachServer} from "./lib/helpers";

/** Finds all the port opening executables available on the home server. */
function findPortHackExecutables(ns: NS) {
  // The names for all port opening executables.
  const portHackExecutables = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];

  const foundExecutables = [];
  for (const exe of portHackExecutables) {
    if (ns.fileExists(exe, "home")) {
      foundExecutables.push(exe);
    }
  }
  return foundExecutables;
}

/** Runs the matching executable on the given server to open its port.
 * @param {string} server Name of the server to open the port on.
 * @param {string} executable The filename for the executable to be run. Must be an executable that opens a port.
 */
function openPort(ns: NS, server: string, executable: string) {
  switch (executable) {
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

/** Attempts to gain root access on the given server.
 *
 * Checks if the player has enough port opening executables unlocked to gain root access on the given server. */
function gainRootAccess(ns: NS, server: string, availableExecutables: string[]) {
  if (ns.hasRootAccess(server)) return;

  const portsToOpen = ns.getServerNumPortsRequired(server);

  // Does the player have enough programs to open the required amount of ports?
  if (availableExecutables.length <= portsToOpen) return;

  // Open the ports.
  for (let i = 0; i < portsToOpen; i++) {
    openPort(ns, server, availableExecutables[i]);
  }

  // Gain root access.
  ns.nuke(server);
  ns.tprint(`Root access gained on: ${server}`);
}

/** Attempts to gain root access to all servers at a specified amount of hops away from the home server. */
export async function main(ns: NS) {
  const availableExecutables = findPortHackExecutables(ns);

  const callback = (ns: NS, serverName: string) => gainRootAccess(ns, serverName, availableExecutables);

  await forEachServer(ns, callback, {
    includeHomeServer: false,
    includePurchasedServers: false,
    UnownedServers: {include: true, hops: 30},
    rootAccessOnly: false,
  });
}
