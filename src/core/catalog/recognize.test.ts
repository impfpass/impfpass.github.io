import { PRODUCTS } from "./products";
import { normalizeLabel, recognizeProduct, suggestProducts } from "./recognize";

it("normalizeLabel vereinheitlicht Schreibweisen", () => {
  expect(normalizeLabel("Boostrix-Polio")).toBe("boostrixpolio");
  expect(normalizeLabel("FSME Immun Junior")).toBe("fsmeimmunjunior");
  expect(normalizeLabel("Röteln Grüße")).toBe("roetelngruesse");
  expect(normalizeLabel("IPV Mérieux")).toBe("ipvmerieux");
});

it("normalisierte Namen und Aliase sind über alle Impfstoffe eindeutig", () => {
  const seen = new Map<string, string>();
  for (const p of PRODUCTS) {
    for (const n of [p.name, ...p.aliases]) {
      const key = normalizeLabel(n);
      expect(seen.get(key) ?? p.id).toBe(p.id);
      seen.set(key, p.id);
    }
  }
});

it("exakt trotz Schreibweise", () => {
  expect(recognizeProduct("boostrix-polio")).toMatchObject({
    kind: "exact",
    product: { name: "Boostrix Polio" },
  });
});

it("exakt über einen Alias", () => {
  expect(recognizeProduct("Vaxigrip Tetra")).toMatchObject({
    kind: "exact",
    product: { name: "Vaxigrip" },
  });
});

it("unscharf bei Lesefehler", () => {
  expect(recognizeProduct("Boostrix Pollo")).toMatchObject({
    kind: "fuzzy",
    product: { name: "Boostrix Polio" },
    distance: 1,
  });
});

it("mehrdeutig bei gleich guten Kandidaten", () => {
  const r = recognizeProduct("Prevenar");
  expect(r.kind).toBe("ambiguous");
  if (r.kind === "ambiguous")
    expect(r.candidates.map((p) => p.name).sort()).toEqual([
      "Prevenar 13",
      "Prevenar 20",
    ]);
});

it("nichts erkannt", () => {
  expect(recognizeProduct("Quarkspeise").kind).toBe("none");
  expect(recognizeProduct("").kind).toBe("none");
});

it("kurze Eingaben werden nicht unscharf zugeordnet", () => {
  // Abstand 1 bei 3 Zeichen sind mehr als 25 %
  expect(recognizeProduct("BCX").kind).toBe("none");
});

it("Vorschläge nach Anfang des Namens", () => {
  expect(suggestProducts("enc").map((p) => p.name)).toContain("Encepur");
  expect(suggestProducts("").length).toBe(0);
});

it("Vorschläge: Anfang vor Enthalten, alphabetisch, höchstens 8, ohne Doppelte", () => {
  const names = suggestProducts("polio").map((p) => p.name);
  expect(names[0]).toBe("Polio-Schluckimpfung");
  expect(names).toContain("Boostrix Polio");
  expect(names.indexOf("Polio-Schluckimpfung")).toBeLessThan(
    names.indexOf("Boostrix Polio"),
  );
  expect(new Set(names).size).toBe(names.length);
  expect(suggestProducts("a").length).toBeLessThanOrEqual(8);
  expect(suggestProducts("a", 3).length).toBe(3);
});
