import {NS} from "@ns";
import {printTable} from "./lib/logger";

/** Sorts the infiltration data by a specific column in descending order.
 *
 * @param data The infiltration data
 * @param sortBy The column to sort by
 */
function sortData(ns: NS, data: string[][], sortBy: string) {
  const sortOptions = {
    difficulty: 0,
    traderep: 3,
    soarep: 4,
  };

  let option: number;
  if (sortBy === "difficulty" || sortBy === "traderep" || sortBy === "soarep") {
    option = sortOptions[sortBy];
  } else {
    ns.tprint(`${sortBy} is not a valid option, canceling sort.\nValid options:\n${Object.keys(sortOptions)}`);
  }

  // sort in descending order.
  data.sort((a, b) => Number(b[option]) - Number(a[option]));
}

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

  let sortBy = ns.args[0];
  if (typeof sortBy !== "string") sortBy = "soarep";
  sortData(ns, arr, sortBy);

  printTable(ns, arr, true);
}
