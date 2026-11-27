import { covid19Rule } from "./recommendations/covid19";
import { FI_ENCEPUR, FI_FSME_IMMUN } from "./recommendations/fachinfo";
import { EB27_URL } from "./recommendations/eb27";
import { hepatitisARule } from "./recommendations/hepatitisA";
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
  version: "2026-11-27.2",
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
    {
      label: "Reiseimpfempfehlungen STIKO/DTG 2026, Epid. Bull. 27/2026",
      url: EB27_URL,
    },
  ],
  changes: [
    {
      version: "2026-11-27.2",
      ids: ["hepatitis_a", "hepatitis_b"],
      validSince: "2026-07-02",
      text: "ImpfPass erinnert an fehlende Dosen angefangener Impfserien gegen Hepatitis A und B und zeigt, wann sie vollständig sind.",
    },
  ],
  rules: [
    tdRule,
    pertussisRule,
    polioRule,
    mmrRule,
    varicellaRule,
    hepatitisBRule,
    hepatitisARule,
    influenzaRule,
    covid19Rule,
    pneumococcalRule,
    zosterRule,
    rsvRule,
    tbeRule,
  ],
};
