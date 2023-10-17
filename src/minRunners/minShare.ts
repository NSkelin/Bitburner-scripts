import {NS} from "@ns";

/** An incredibly cheap server RAM sharer meant to be controlled by another script. */
export async function main(ns: NS) {
  while (true) {
    await ns.share();
  }
}
