// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  combinedHash,
  extractMainText,
  findChanges,
  hashText,
  issueBody,
  issueTitle,
  watchedPages,
  type PageText,
  type WatchState,
} from "./watch.ts";

const page = (main: string) =>
  `<html><body><header>Kopf</header><nav>Menü</nav><main>${main}</main><footer>Fuß</footer></body></html>`;

const pt = (id: string, text: string): PageText => ({
  id,
  url: `https://example.org/${id}`,
  hash: hashText(text),
  text,
});

describe("extractMainText", () => {
  it("nimmt nur den Haupttext, ohne Navigation, Skripte und weiche Trennstriche", () => {
    expect(
      extractMainText(
        page(
          "<h1>STIKO-Emp&shy;fehlungen</h1><script>x()</script><p>Td alle 10&nbsp;Jahre &amp; mehr</p>",
        ),
      ),
    ).toBe("STIKO-Empfehlungen\nTd alle 10 Jahre & mehr");
  });
  it("andere Klassen und Verschachtelung ergeben denselben Text", () => {
    expect(extractMainText(page('<div class="a"><p>Satz</p></div>'))).toBe(
      extractMainText(page('<section><div class="b"><p>Satz</p></div></section>')),
    );
  });
  it("Links auf PDFs behalten ihre Adresse samt Versionszähler", () => {
    expect(
      extractMainText(
        page(
          '<p><a href="/a/04_26.pdf?__blob=publicationFile&amp;v=12">Empfehlungen 2026</a></p>',
        ),
      ),
    ).toBe("Empfehlungen 2026 (/a/04_26.pdf?__blob=publicationFile&v=12)");
  });
});

describe("watchedPages", () => {
  it("das Jahresarchiv des Bulletins zählt nur Zeilen mit STIKO", () => {
    const bull = watchedPages(2026, 11).find((p) => p.id === "epid-bull-2026");
    expect(bull?.url).toContain("/Epidemiologisches-Bulletin/2026/EB-2026-node.html");
    expect(bull?.missingIsEmpty).toBe(true);
    const lines = ["Ausgabe 1: Masern", "Ausgabe 2: STIKO-Beschluss"];
    expect(lines.filter((l) => bull!.lineFilter!.test(l))).toEqual([
      "Ausgabe 2: STIKO-Beschluss",
    ]);
  });
  it("im Januar zusätzlich das Archiv des Vorjahres, mit demselben Filter", () => {
    const ids = (month: number) => watchedPages(2027, month).map((p) => p.id);
    expect(ids(1)).toEqual([
      "stiko-empfehlungen",
      "stiko-begruendungen",
      "stiko-mitteilungen",
      "epid-bull-2027",
      "epid-bull-2026",
    ]);
    expect(ids(2)).not.toContain("epid-bull-2026");
    expect(ids(12)).not.toContain("epid-bull-2026");
    const prev = watchedPages(2027, 1).find((p) => p.id === "epid-bull-2026");
    expect(prev?.url).toContain("/Epidemiologisches-Bulletin/2026/EB-2026-node.html");
    const lines = ["Ausgabe 50: Masern", "Ausgabe 51: STIKO-Beschluss"];
    expect(lines.filter((l) => prev!.lineFilter!.test(l))).toEqual([
      "Ausgabe 51: STIKO-Beschluss",
    ]);
  });
});

describe("findChanges", () => {
  it("unveränderte Seiten ergeben keine Änderung", () => {
    const cur = [pt("a", "x\ny")];
    expect(findChanges({ pages: cur }, cur)).toEqual([]);
  });
  it("geänderter Absatz erscheint als hinzugekommen und entfernt", () => {
    const state: WatchState = { pages: [pt("a", "Gleich\nAlt")] };
    const changes = findChanges(state, [pt("a", "Gleich\nNeu")]);
    expect(changes).toEqual([
      { id: "a", url: "https://example.org/a", added: ["Neu"], removed: ["Alt"] },
    ]);
  });
  it("Seite ohne gespeicherten Stand gilt als hinzugekommen, leer aber nicht", () => {
    const changes = findChanges({ pages: [] }, [pt("a", "x\ny"), pt("b", "")]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: "a", added: ["x", "y"], removed: [] });
  });
  it("nicht mehr beobachtete Seiten im Stand werden übergangen", () => {
    const state: WatchState = { pages: [pt("epid-bull-2025", "alt"), pt("a", "x")] };
    expect(findChanges(state, [pt("a", "x")])).toEqual([]);
  });
});

describe("Meldung", () => {
  it("Titel enthält den kombinierten Hash", () => {
    expect(issueTitle("a1b2c3d4e5f6")).toBe("STIKO-Seiten geändert (a1b2c3d4e5f6)");
  });
  it("kombinierter Hash hat 12 Hex-Zeichen und hängt vom Inhalt ab", () => {
    const h = combinedHash([pt("a", "x")]);
    expect(h).toMatch(/^[0-9a-f]{12}$/);
    expect(combinedHash([pt("a", "y")])).not.toBe(h);
  });
  it("Text des Issues kürzt auf 40 Zeilen je Richtung", () => {
    const added = Array.from({ length: 50 }, (_, i) => `neu ${i}`);
    const body = issueBody([{ id: "a", url: "https://example.org/a", added, removed: ["alt"] }]);
    expect(body).toContain("https://example.org/a");
    expect(body.match(/^\+ /gm)).toHaveLength(40);
    expect(body).toContain("- alt");
    expect(body).toContain("Ablauf: siehe Abschnitt „Regeln aktualisieren“ in `CLAUDE.md`.");
  });
});
