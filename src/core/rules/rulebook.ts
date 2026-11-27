import { covid19Rule } from "./recommendations/covid19";
import { hepatitisBRule } from "./recommendations/hepatitisB";
import { influenzaRule } from "./recommendations/influenza";
import { mmrRule } from "./recommendations/mmr";
import { pertussisRule } from "./recommendations/pertussis";
import { polioRule } from "./recommendations/polio";
import { tdRule } from "./recommendations/td";
import { varicellaRule } from "./recommendations/varicella";
import type { Rulebook } from "./types";

/** Die übrigen Regeln kommen in den Aufgaben 7 und 8 dazu. */
export const RULEBOOK: Rulebook = {
  version: "2026-11-27.1",
  edition: "Epid. Bull. 4/2026, geprüft bis Epid. Bull. 48/2026",
  sources: [],
  changes: [],
  rules: [
    tdRule,
    pertussisRule,
    polioRule,
    mmrRule,
    varicellaRule,
    hepatitisBRule,
    influenzaRule,
    covid19Rule,
  ],
};
