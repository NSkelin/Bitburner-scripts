import {NS} from "@ns";
import {printTable} from "./lib/logger";

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

  // arr.sort((a, b) => a.diff - b.diff);
  // arr.sort((a, b) => a.tradeRep - b.tradeRep);
  arr.sort((a, b) => Number(a[4]) - Number(b[4]));

  printTable(ns, arr, true);
}
