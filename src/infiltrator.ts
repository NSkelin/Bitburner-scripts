import {NS} from "@ns";

export async function main(ns: NS) {
  const locals = ns.infiltration.getPossibleLocations();
  const arr = [];

  for (const location of locals) {
    const infiltrationData = ns.infiltration.getInfiltration(location.name);
    const diff = Math.round(infiltrationData.difficulty * 100) / 100;
    const city = infiltrationData.location.city;
    const company = infiltrationData.location.name;
    const tradeRep = Math.round(infiltrationData.reward.tradeRep);
    const SoARep = Math.round(infiltrationData.reward.SoARep);

    arr.push({diff, city, company, tradeRep, SoARep});
  }

  // arr.sort((a, b) => a.diff - b.diff);
  // arr.sort((a, b) => a.tradeRep - b.tradeRep);
  arr.sort((a, b) => a.SoARep - b.SoARep);

  ns.tprint("difficulty, city, company, tradeRep gain, SoARep gain");
  for (const {diff, city, company, tradeRep, SoARep} of arr) {
    ns.tprint(`${diff}, ${city}, ${company}, ${tradeRep}, ${SoARep}`);
  }
}
