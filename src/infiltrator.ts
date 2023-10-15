import {NS} from "@ns";
import {sortTable, tprintTable} from "./lib/logger";

/** Gathers useful infiltration data and displays it in a table. */
export async function main(ns: NS) {
  const locals = ns.infiltration.getPossibleLocations();
  const arr = [["difficulty", "city", "company", "tradeRep gain", "SoARep gain"]];

  for (const location of locals) {
    const infiltrationData = ns.infiltration.getInfiltration(location.name);
    const diff = (Math.round(infiltrationData.difficulty * 100) / 100).toString();
    const city = infiltrationData.location.city;
    const company = infiltrationData.location.name;
    const tradeRep = Math.round(infiltrationData.reward.tradeRep).toString();
    const SoARep = Math.round(infiltrationData.reward.SoARep).toString();

    arr.push([diff, city, company, tradeRep, SoARep]);
  }

  if (typeof ns.args[0] === "string") {
    sortTable(ns, arr, ns.args[0]);
  }

  tprintTable(ns, arr, true);
}
