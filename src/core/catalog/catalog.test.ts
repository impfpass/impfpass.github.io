import { DISEASE_IDS, DISEASES } from "./diseases";
import { getProduct, PRODUCTS } from "./products";

it("Produkt-IDs sind eindeutig, alle Krankheiten existieren", () => {
  const ids = PRODUCTS.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const p of PRODUCTS) {
    expect(p.diseases.length).toBeGreaterThan(0);
    for (const d of p.diseases) expect(DISEASE_IDS).toContain(d);
  }
});

it("jede Krankheit hat einen deutschen Namen und mindestens einen Impfstoff", () => {
  for (const d of DISEASE_IDS) {
    expect(DISEASES[d].name.length).toBeGreaterThan(0);
    expect(PRODUCTS.some((p) => p.diseases.includes(d))).toBe(true);
  }
});

it("Krankheiten eines Impfstoffs stehen in der Reihenfolge der Krankheitsliste", () => {
  for (const p of PRODUCTS) {
    const order = p.diseases.map((d) => DISEASE_IDS.indexOf(d));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  }
});

it("enthält diese Impfstoffe mit diesen Krankheiten", () => {
  const byName = (n: string) => PRODUCTS.find((p) => p.name === n)!;
  expect(byName("Boostrix Polio").diseases.sort()).toEqual([
    "diphtheria",
    "pertussis",
    "polio",
    "tetanus",
  ]);
  expect(byName("Shingrix").diseases).toEqual(["zoster"]);
  expect(byName("Priorix").diseases.sort()).toEqual([
    "measles",
    "mumps",
    "rubella",
  ]);
  expect(byName("Encepur").diseases).toEqual(["tbe"]);
  expect(byName("Zostavax").historic).toBe(true);
});

it("enthält den Pflichtumfang aus Plan 1", () => {
  const required = [
    "Td-pur",
    "Td-Rix",
    "Tetanol",
    "Boostrix",
    "Repevax",
    "Covaxis",
    "Revaxis",
    "IPV Merieux",
    "Polio-Schluckimpfung",
    "M-M-RvaxPro",
    "Priorix-Tetra",
    "ProQuad",
    "Varivax",
    "Varilrix",
    "Gardasil",
    "Gardasil 9",
    "Cervarix",
    "Engerix-B",
    "HBVaxPro",
    "Heplisav B",
    "Havrix",
    "Vaqta",
    "Twinrix",
    "Prevenar 13",
    "Prevenar 20",
    "Pneumovax 23",
    "Vaxneuvance",
    "Capvaxive",
    "Influsplit Tetra",
    "Vaxigrip Tetra",
    "Fluad",
    "Efluelda",
    "Flucelvax",
    "Comirnaty",
    "Spikevax",
    "Nuvaxovid",
    "Vaxzevria",
    "Jcovden",
    "Arexvy",
    "Abrysvo",
    "mResvia",
    "FSME-Immun",
    "Menjugate",
    "NeisVac-C",
    "Nimenrix",
    "Menveo",
    "MenQuadfi",
    "Bexsero",
    "Trumenba",
    "Stamaril",
    "Typhim Vi",
    "Vivotif",
    "Rabipur",
    "Verorab",
    "Ixiaro",
    "Dukoral",
    "Imvanex",
    "Qdenga",
    "Ixchiq",
    "BCG",
    "Pocken-Impfstoff",
  ];
  const names = PRODUCTS.map((p) => p.name);
  for (const n of required) expect(names).toContain(n);
  for (const n of [
    "Tetanol",
    "Polio-Schluckimpfung",
    "BCG",
    "Pocken-Impfstoff",
  ]) {
    expect(PRODUCTS.find((p) => p.name === n)!.historic).toBe(true);
  }
});

it("getProduct findet nach ID", () => {
  const p = PRODUCTS[0];
  expect(getProduct(p.id)).toBe(p);
  expect(getProduct("gibt-es-nicht")).toBeUndefined();
});
