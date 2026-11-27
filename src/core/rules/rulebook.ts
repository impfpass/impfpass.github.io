import { covid19Rule } from "./recommendations/covid19";
import { FI_ENCEPUR, FI_FSME_IMMUN } from "./recommendations/fachinfo";
import { hepatitisBRule } from "./recommendations/hepatitisB";
import { influenzaRule } from "./recommendations/influenza";
import { mmrRule } from "./recommendations/mmr";
import { pertussisRule } from "./recommendations/pertussis";
import { pneumococcalRule } from "./recommendations/pneumococcal";
import { polioRule } from "./recommendations/polio";
import { rsvRule } from "./recommendations/rsv";
import { tbeRule } from "./recommendations/tbe";
import { tdRule } from "./recommendations/td";
import { varicellaRule } from "./recommendations/varicella";
import { zosterRule } from "./recommendations/zoster";
import type { Rulebook } from "./types";

export const RULEBOOK: Rulebook = {
  version: "2026-11-27.1",
  edition: "Epid. Bull. 4/2026, geprüft bis Epid. Bull. 48/2026",
  sources: [
    {
      label: "STIKO-Empfehlungen 2026, Epid. Bull. 4/2026",
      url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/04_26.pdf?__blob=publicationFile",
    },
    {
      label: "COVID-19-Beschluss, Epid. Bull. 28/2026",
      url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/28_26.pdf?__blob=publicationFile",
    },
    {
      label: "Herpes-zoster-Beschluss, Epid. Bull. 45/2025",
      url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2025/45_25.pdf?__blob=publicationFile",
    },
    { label: FI_FSME_IMMUN.edition, url: FI_FSME_IMMUN.url },
    { label: FI_ENCEPUR.edition, url: FI_ENCEPUR.url },
  ],
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
    pneumococcalRule,
    zosterRule,
    rsvRule,
    tbeRule,
  ],
};
