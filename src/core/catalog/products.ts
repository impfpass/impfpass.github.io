import type { DiseaseId } from "./diseases";

export interface Product {
  id: string;
  name: string;
  /** Andere Schreibweisen und frühere Namen desselben Impfstoffs. */
  aliases: string[];
  /** Abgedeckte Krankheiten in der Reihenfolge von DISEASE_IDS. */
  diseases: DiseaseId[];
  /** Nicht mehr erhältlich, steht aber in alten Impfpässen. */
  historic?: boolean;
}

const TD: DiseaseId[] = ["tetanus", "diphtheria"];
const TDAP: DiseaseId[] = ["tetanus", "diphtheria", "pertussis"];
const TDAP_IPV: DiseaseId[] = ["tetanus", "diphtheria", "pertussis", "polio"];
const HEXA: DiseaseId[] = [
  "tetanus",
  "diphtheria",
  "pertussis",
  "polio",
  "hepatitis_b",
  "hib",
];
const MMR: DiseaseId[] = ["measles", "mumps", "rubella"];
const MMRV: DiseaseId[] = ["measles", "mumps", "rubella", "varicella"];

/**
 * Impfstoffe mit Handelsnamen. Abgedeckte Krankheiten nach Fachinformation
 * (EMA/EPAR bzw. Paul-Ehrlich-Institut). Selbst zusammengestellt, nicht aus dem
 * Projekt Impfbuch übernommen (dort keine Lizenz, Stand 26.11.2026).
 */
export const PRODUCTS: Product[] = [
  // Tetanus, Diphtherie, Keuchhusten, Polio, Hib
  {
    // Herstellung 2025 eingestellt, Nachfolger Td-IMMUN (PEI, 17.09.2025)
    id: "td-pur",
    name: "Td-pur",
    aliases: [],
    diseases: TD,
    historic: true,
  },
  { id: "td-immun", name: "Td-IMMUN", aliases: [], diseases: TD },
  { id: "td-rix", name: "Td-Rix", aliases: [], diseases: TD },
  {
    id: "tetanol",
    name: "Tetanol",
    aliases: ["Tetanol pur"],
    diseases: ["tetanus"],
    historic: true,
  },
  { id: "boostrix", name: "Boostrix", aliases: [], diseases: TDAP },
  {
    id: "boostrix-polio",
    name: "Boostrix Polio",
    aliases: ["Boostrix-IPV"],
    diseases: TDAP_IPV,
  },
  { id: "repevax", name: "Repevax", aliases: [], diseases: TDAP_IPV },
  { id: "covaxis", name: "Covaxis", aliases: [], diseases: TDAP },
  {
    id: "revaxis",
    name: "Revaxis",
    aliases: [],
    diseases: ["tetanus", "diphtheria", "polio"],
  },
  { id: "infanrix", name: "Infanrix", aliases: [], diseases: TDAP },
  { id: "infanrix-hexa", name: "Infanrix hexa", aliases: [], diseases: HEXA },
  { id: "hexyon", name: "Hexyon", aliases: [], diseases: HEXA },
  { id: "vaxelis", name: "Vaxelis", aliases: [], diseases: HEXA },
  {
    id: "ipv-merieux",
    name: "IPV Merieux",
    aliases: ["IPV Mérieux"],
    diseases: ["polio"],
  },
  {
    id: "polio-oral",
    name: "Polio-Schluckimpfung",
    aliases: ["OPV"],
    diseases: ["polio"],
    historic: true,
  },
  {
    // In Deutschland nicht mehr im Handel, nur Einzelimport (PEI)
    id: "act-hib",
    name: "Act-HIB",
    aliases: [],
    diseases: ["hib"],
    historic: true,
  },

  // Masern, Mumps, Röteln, Windpocken
  { id: "m-m-rvaxpro", name: "M-M-RvaxPro", aliases: [], diseases: MMR },
  { id: "priorix", name: "Priorix", aliases: [], diseases: MMR },
  { id: "priorix-tetra", name: "Priorix-Tetra", aliases: [], diseases: MMRV },
  { id: "proquad", name: "ProQuad", aliases: [], diseases: MMRV },
  { id: "varivax", name: "Varivax", aliases: [], diseases: ["varicella"] },
  { id: "varilrix", name: "Varilrix", aliases: [], diseases: ["varicella"] },

  // HPV
  { id: "gardasil", name: "Gardasil", aliases: [], diseases: ["hpv"] },
  { id: "gardasil-9", name: "Gardasil 9", aliases: [], diseases: ["hpv"] },
  { id: "cervarix", name: "Cervarix", aliases: [], diseases: ["hpv"] },

  // Hepatitis
  {
    id: "engerix-b",
    name: "Engerix-B",
    aliases: [],
    diseases: ["hepatitis_b"],
  },
  { id: "hbvaxpro", name: "HBVaxPro", aliases: [], diseases: ["hepatitis_b"] },
  {
    id: "heplisav-b",
    name: "Heplisav B",
    aliases: [],
    diseases: ["hepatitis_b"],
  },
  {
    id: "havrix",
    name: "Havrix",
    aliases: ["Havrix 1440", "Havrix 720"],
    diseases: ["hepatitis_a"],
  },
  { id: "vaqta", name: "Vaqta", aliases: [], diseases: ["hepatitis_a"] },
  {
    id: "twinrix",
    name: "Twinrix",
    aliases: ["Twinrix Erwachsene", "Twinrix Kinder"],
    diseases: ["hepatitis_a", "hepatitis_b"],
  },

  // Pneumokokken
  {
    id: "prevenar-13",
    name: "Prevenar 13",
    aliases: [],
    diseases: ["pneumococcal"],
  },
  {
    id: "prevenar-20",
    name: "Prevenar 20",
    aliases: [],
    diseases: ["pneumococcal"],
  },
  {
    id: "pneumovax-23",
    name: "Pneumovax 23",
    aliases: ["Pneumovax"],
    diseases: ["pneumococcal"],
  },
  {
    id: "vaxneuvance",
    name: "Vaxneuvance",
    aliases: [],
    diseases: ["pneumococcal"],
  },
  {
    id: "capvaxive",
    name: "Capvaxive",
    aliases: [],
    diseases: ["pneumococcal"],
  },

  // Grippe. Seit der Saison 2024/25 dreifach; die früheren Namen mit
  // „Tetra“ stehen als Alias (PEI-Liste 2025/26).
  {
    id: "influsplit",
    name: "Influsplit",
    aliases: ["Influsplit Tetra"],
    diseases: ["influenza"],
  },
  {
    id: "vaxigrip",
    name: "Vaxigrip",
    aliases: ["Vaxigrip Tetra"],
    diseases: ["influenza"],
  },
  {
    id: "influvac",
    name: "Influvac",
    aliases: ["Influvac Tetra"],
    diseases: ["influenza"],
  },
  {
    id: "fluad",
    name: "Fluad",
    aliases: ["Fluad Tetra"],
    diseases: ["influenza"],
  },
  {
    id: "efluelda",
    name: "Efluelda",
    aliases: ["Efluelda Tetra"],
    diseases: ["influenza"],
  },
  {
    id: "flucelvax",
    name: "Flucelvax",
    aliases: ["Flucelvax Tetra"],
    diseases: ["influenza"],
  },
  { id: "xanaflu", name: "Xanaflu", aliases: [], diseases: ["influenza"] },
  {
    id: "fluenz",
    name: "Fluenz",
    aliases: ["Fluenz Tetra"],
    diseases: ["influenza"],
  },

  // COVID-19
  { id: "comirnaty", name: "Comirnaty", aliases: [], diseases: ["covid19"] },
  {
    id: "spikevax",
    name: "Spikevax",
    aliases: ["COVID-19 Vaccine Moderna"],
    diseases: ["covid19"],
  },
  { id: "nuvaxovid", name: "Nuvaxovid", aliases: [], diseases: ["covid19"] },
  {
    id: "vaxzevria",
    name: "Vaxzevria",
    aliases: ["COVID-19 Vaccine AstraZeneca"],
    diseases: ["covid19"],
    historic: true,
  },
  {
    id: "jcovden",
    name: "Jcovden",
    aliases: ["COVID-19 Vaccine Janssen"],
    diseases: ["covid19"],
    historic: true,
  },

  // Gürtelrose
  { id: "shingrix", name: "Shingrix", aliases: [], diseases: ["zoster"] },
  {
    id: "zostavax",
    name: "Zostavax",
    aliases: [],
    diseases: ["zoster"],
    historic: true,
  },

  // RSV
  { id: "arexvy", name: "Arexvy", aliases: [], diseases: ["rsv"] },
  { id: "abrysvo", name: "Abrysvo", aliases: [], diseases: ["rsv"] },
  { id: "mresvia", name: "mResvia", aliases: [], diseases: ["rsv"] },

  // FSME
  {
    id: "fsme-immun",
    name: "FSME-Immun",
    aliases: ["FSME-Immun Erwachsene", "FSME-Immun Junior"],
    diseases: ["tbe"],
  },
  {
    id: "encepur",
    name: "Encepur",
    aliases: ["Encepur Erwachsene", "Encepur Kinder"],
    diseases: ["tbe"],
  },

  // Meningokokken
  {
    id: "menjugate",
    name: "Menjugate",
    aliases: [],
    diseases: ["meningococcal_c"],
  },
  {
    id: "neisvac-c",
    name: "NeisVac-C",
    aliases: [],
    diseases: ["meningococcal_c"],
  },
  {
    id: "nimenrix",
    name: "Nimenrix",
    aliases: [],
    diseases: ["meningococcal_acwy"],
  },
  {
    id: "menveo",
    name: "Menveo",
    aliases: [],
    diseases: ["meningococcal_acwy"],
  },
  {
    id: "menquadfi",
    name: "MenQuadfi",
    aliases: [],
    diseases: ["meningococcal_acwy"],
  },
  {
    id: "bexsero",
    name: "Bexsero",
    aliases: [],
    diseases: ["meningococcal_b"],
  },
  {
    id: "trumenba",
    name: "Trumenba",
    aliases: [],
    diseases: ["meningococcal_b"],
  },

  // Rotaviren
  { id: "rotarix", name: "Rotarix", aliases: [], diseases: ["rotavirus"] },
  { id: "rotateq", name: "RotaTeq", aliases: [], diseases: ["rotavirus"] },

  // Reiseimpfungen
  { id: "stamaril", name: "Stamaril", aliases: [], diseases: ["yellow_fever"] },
  { id: "typhim-vi", name: "Typhim Vi", aliases: [], diseases: ["typhoid"] },
  { id: "vivotif", name: "Vivotif", aliases: [], diseases: ["typhoid"] },
  {
    id: "typhoral-l",
    name: "Typhoral L",
    aliases: [],
    diseases: ["typhoid"],
  },
  { id: "rabipur", name: "Rabipur", aliases: [], diseases: ["rabies"] },
  { id: "verorab", name: "Verorab", aliases: [], diseases: ["rabies"] },
  {
    id: "ixiaro",
    name: "Ixiaro",
    aliases: [],
    diseases: ["japanese_encephalitis"],
  },
  { id: "dukoral", name: "Dukoral", aliases: [], diseases: ["cholera"] },
  { id: "vaxchora", name: "Vaxchora", aliases: [], diseases: ["cholera"] },
  {
    id: "imvanex",
    name: "Imvanex",
    aliases: ["Jynneos"],
    diseases: ["mpox", "smallpox"],
  },
  { id: "qdenga", name: "Qdenga", aliases: [], diseases: ["dengue"] },
  { id: "ixchiq", name: "Ixchiq", aliases: [], diseases: ["chikungunya"] },
  { id: "vimkunya", name: "Vimkunya", aliases: [], diseases: ["chikungunya"] },

  // Historisch
  {
    id: "bcg",
    name: "BCG",
    aliases: ["BCG-Impfstoff"],
    diseases: ["tuberculosis"],
    historic: true,
  },
  {
    id: "pocken",
    name: "Pocken-Impfstoff",
    aliases: ["Pockenschutzimpfung"],
    diseases: ["smallpox"],
    historic: true,
  },
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string): Product | undefined {
  return BY_ID.get(id);
}
