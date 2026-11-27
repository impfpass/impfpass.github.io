import { inflateSync } from "fflate";
import { T } from "@/texts";
import { packParts, typicalEntries } from "@/test/transfer";
import type { TransferPayload } from "../model";
import { decodeBase45 } from "./base45";
import {
  addPart,
  decodeCollected,
  encodeTransfer,
  MAX_TRANSFER_BYTES,
  missingParts,
  newTransferId,
  QR_PART_CHARS,
  readTransferText,
  toTextLine,
  TransferError,
  transferFileName,
  type TransferCollector,
} from "./transfer";

const CREATED_AT = "2026-11-27T10:00:00.000Z";
const PART = /^IP:1:\d+\/\d+:[0-9A-Z]{6}:[0-9A-Z $%*+\-./:]+:[0-9A-F]{8}$/;

const payload: TransferPayload = {
  id: "K7Q2M9",
  createdAt: CREATED_AT,
  entries: [
    {
      date: "2016-12-05",
      datePrecision: "day",
      productId: "boostrix-polio",
      label: "Boostrix Polio",
      diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
      batch: "AC52B123AB",
      doctor: "Praxis Dr. Muster, Hamburg",
    },
    {
      date: "1998-03-01",
      datePrecision: "month",
      productId: "priorix",
      label: "Priorix (Masern, Mumps, Röteln)",
      diseases: ["measles", "mumps", "rubella"],
      doctor: "Gesundheitsamt",
      note: "Schulimpfung",
    },
    {
      date: "1975-01-01",
      datePrecision: "year",
      productId: null,
      label: "Pocken",
      diseases: ["smallpox"],
    },
  ],
};

const typical = (n: number, id = "TYP050"): TransferPayload => ({
  id,
  createdAt: CREATED_AT,
  entries: typicalEntries(n),
});

/** Code des TransferError, den `fn` wirft. */
function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof TransferError) return e.code;
    throw e;
  }
  throw new Error("kein Fehler geworfen");
}

function collect(lines: readonly string[]): TransferCollector {
  let c: TransferCollector | null = null;
  for (const line of lines) c = addPart(c, line).collector;
  return c!;
}

/** Entpackt Teilzeilen von Hand, um das Format vor dem Packen zu prüfen. */
function unpack(lines: readonly string[]): unknown {
  const data = lines.map((l) => l.split(":").slice(4, -1).join(":")).join("");
  return JSON.parse(new TextDecoder().decode(inflateSync(decodeBase45(data))));
}

describe("encodeTransfer und readTransferText", () => {
  it("übersteht Hin und zurück mit und ohne Impfstoff, Tag, Monat, Jahr", () => {
    expect(readTransferText(encodeTransfer(payload).join("\n"))).toEqual({
      payload,
    });
  });

  it("übersteht Hin und zurück mit 50 typischen Einträgen", () => {
    const p = typical(50);
    expect(readTransferText(encodeTransfer(p).join("\n"))).toEqual({
      payload: p,
    });
  });

  it("packt kompakt: Datum mit seiner Genauigkeit, 0 für Voreinstellungen, Nullen am Ende entfallen", () => {
    const p: TransferPayload = {
      id: "K7Q2M9",
      createdAt: CREATED_AT,
      entries: [
        ...payload.entries,
        {
          date: "2021-06-01",
          datePrecision: "day",
          productId: "td-immun",
          label: "Td-IMMUN",
          diseases: ["tetanus"],
        },
        {
          date: "1980-05-01",
          datePrecision: "month",
          productId: null,
          label: "Tetanus-Impfung",
          diseases: ["tetanus"],
        },
        {
          date: "1982-01-01",
          datePrecision: "year",
          productId: null,
          label: "Tetanus, Diphtherie",
          diseases: ["diphtheria", "tetanus"],
          note: "aus dem alten Pass",
        },
      ],
    };
    expect(unpack(encodeTransfer(p))).toEqual({
      i: "K7Q2M9",
      c: CREATED_AT,
      e: [
        [
          "2016-12-05",
          "boostrix-polio",
          0,
          0,
          "AC52B123AB",
          "Praxis Dr. Muster, Hamburg",
        ],
        [
          "1998-03",
          "priorix",
          "Priorix (Masern, Mumps, Röteln)",
          0,
          0,
          "Gesundheitsamt",
          "Schulimpfung",
        ],
        ["1975", 0, 0, ["smallpox"]],
        ["2021-06-01", "td-immun", 0, ["tetanus"]],
        ["1980-05", 0, "Tetanus-Impfung", ["tetanus"]],
        ["1982", 0, 0, ["diphtheria", "tetanus"], 0, 0, "aus dem alten Pass"],
      ],
    });
    expect(readTransferText(encodeTransfer(p).join("\n"))).toEqual({
      payload: p,
    });
  });

  it("jede Teilzeile hat das beschriebene Format", () => {
    const lines = [
      ...encodeTransfer(payload),
      ...encodeTransfer(typical(50)),
      ...encodeTransfer(typical(50), 100),
    ];
    for (const line of lines) expect(line).toMatch(PART);
  });

  it("50 typische Einträge ergeben höchstens 3 Codes mit je höchstens QR_PART_CHARS + 30 Zeichen", () => {
    const lines = encodeTransfer(typical(50));
    expect(lines.length).toBeLessThanOrEqual(3);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(QR_PART_CHARS + 30);
    }
  });

  it("ohne Längengrenze für Datei und Text ist es ein einziger Teil", () => {
    const lines = encodeTransfer(typical(50), Infinity);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^IP:1:1\/1:TYP050:/);
  });

  it("erzeugt keine Zeilen, die sich nicht lesen lassen", () => {
    expect(() => encodeTransfer({ ...payload, id: "k7q2m9" })).toThrow(
      RangeError,
    );
    expect(() => encodeTransfer(payload, 0)).toThrow(RangeError);
    // Mehr als 99 Teile kann die Zeile nicht ausdrücken.
    expect(() => encodeTransfer(typical(50), 5)).toThrow(RangeError);
  });

  it("verträgt Leerzeilen, Leerzeichen am Zeilenanfang und Windows-Zeilenenden", () => {
    const p = typical(50);
    const lines = encodeTransfer(p, 200);
    const text = `\r\n\r\n  ${lines.join("\r\n\r\n   ")}\r\n  \r\n`;
    expect(readTransferText(text)).toEqual({ payload: p });
  });

  it("überspringt fremde Zeilen zwischen den Teilen", () => {
    const text = ["Hier ist die Übertragung:", ...encodeTransfer(payload)];
    expect(readTransferText(text.join("\n"))).toEqual({ payload });
  });

  it("meldet fehlende Teile, wenn nicht alle Zeilen im Text stehen", () => {
    const lines = encodeTransfer(typical(50), 200);
    const result = readTransferText([lines[0], lines[2]].join("\n"));
    expect("missing" in result && result.missing).toEqual(
      Array.from({ length: lines.length }, (_, i) => i + 1).filter(
        (n) => n !== 1 && n !== 3,
      ),
    );
  });

  it("ohne Teilzeile ist es keine Übertragung", () => {
    expect(errorCode(() => readTransferText("Hallo\n\nWelt"))).toBe(
      "notTransfer",
    );
    expect(errorCode(() => readTransferText(""))).toBe("notTransfer");
  });

  it("Dateiname mit dem lokalen Datum", () => {
    expect(transferFileName(new Date(2026, 10, 27, 23, 30))).toBe(
      "impfpass-uebertragung-2026-11-27.txt",
    );
  });

  it("newTransferId ergibt 6 Zeichen aus 0-9 und A-Z", () => {
    const ids = Array.from({ length: 50 }, newTransferId);
    for (const id of ids) expect(id).toMatch(/^[0-9A-Z]{6}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("toTextLine", () => {
  it("enthält kein Leerzeichen und wird wie die normale Zeile gelesen", () => {
    const p = typical(50);
    const [line] = encodeTransfer(p, Infinity);
    expect(line).toContain(" ");
    const text = toTextLine(line);
    expect(text).not.toContain(" ");
    expect(readTransferText(text)).toEqual({ payload: p });
    expect(
      readTransferText(`${text}
`),
    ).toEqual({ payload: p });
  });

  it("lässt die Zeilen für QR-Codes unberührt", () => {
    const lines = encodeTransfer(typical(50));
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((l) => l.includes(" "))).toBe(true);
    expect(lines.every((l) => PART.test(l))).toBe(true);
  });
});

describe("addPart, missingParts und decodeCollected", () => {
  const p = typical(50);
  const lines = encodeTransfer(p, 200);

  it("Teile in umgekehrter Reihenfolge ergeben das Ganze", () => {
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const c = collect([...lines].reverse());
    expect(missingParts(c)).toEqual([]);
    expect(decodeCollected(c)).toEqual(p);
  });

  it("derselbe Teil zweimal wird nicht noch einmal aufgenommen", () => {
    const first = addPart(null, lines[0]);
    expect(first.added).toBe(true);
    const again = addPart(first.collector, lines[0]);
    expect(again.added).toBe(false);
    expect(again.collector).toEqual(first.collector);
  });

  it("lässt den alten Sammler unverändert", () => {
    const first = addPart(null, lines[0]).collector;
    const snapshot = { ...first, chunks: [...first.chunks] };
    addPart(first, lines[1]);
    expect(first).toEqual(snapshot);
  });

  it("fehlender Teil", () => {
    const c = collect([lines[0], ...lines.slice(2)]);
    expect(missingParts(c)).toEqual([2]);
    expect(() => decodeCollected(c)).toThrow();
  });

  it("ein Teil einer anderen Übertragung", () => {
    const other = encodeTransfer({ ...payload, id: "OTHER1" });
    const c = addPart(null, lines[0]).collector;
    expect(errorCode(() => addPart(c, other[0]))).toBe("otherTransfer");
  });

  it("gleiche ID, aber andere Teilzahl, Prüfsumme oder Daten ist beschädigt", () => {
    const c = addPart(null, lines[0]).collector;
    const otherTotal = encodeTransfer(p, 300);
    expect(otherTotal.length).not.toBe(lines.length);
    expect(errorCode(() => addPart(c, otherTotal[1]))).toBe("corrupt");

    const single = addPart(null, encodeTransfer(payload)[0]).collector;
    const otherCrc = encodeTransfer({
      ...payload,
      createdAt: CREATED_AT.replace("10:", "11:"),
    });
    expect(errorCode(() => addPart(single, otherCrc[0]))).toBe("corrupt");

    const sameNumberOtherData = lines[0].replace(
      /^(IP:1:1\/\d+:TYP050:)(.)/,
      (_, head: string, ch: string) => head + (ch === "0" ? "1" : "0"),
    );
    expect(errorCode(() => addPart(c, sameNumberOtherData))).toBe("corrupt");
  });

  it("ein geändertes Zeichen in den Daten fällt beim Zusammensetzen auf", () => {
    const line = encodeTransfer(payload)[0];
    const at = "IP:1:1/1:K7Q2M9:".length + 5;
    const changed =
      line.slice(0, at) + (line[at] === "0" ? "1" : "0") + line.slice(at + 1);
    const c = addPart(null, changed).collector;
    expect(missingParts(c)).toEqual([]);
    expect(errorCode(() => decodeCollected(c))).toBe("corrupt");
  });

  it("fremde Zeichen in den Daten fallen beim Zusammensetzen auf", () => {
    const line = encodeTransfer(payload)[0];
    const at = "IP:1:1/1:K7Q2M9:".length + 5;
    const changed = line.slice(0, at) + "a" + line.slice(at + 1);
    const c = addPart(null, changed).collector;
    expect(errorCode(() => decodeCollected(c))).toBe("corrupt");
  });

  it("Daten mit Doppelpunkt: die Prüfsumme steht nach dem letzten", () => {
    const { collector } = addPart(null, "IP:1:2/2:ABCDEF:AB:C D::12345678");
    expect(collector).toEqual({
      id: "ABCDEF",
      total: 2,
      crc: "12345678",
      chunks: [undefined, "AB:C D:"],
    });
  });

  it("andere Codes sind keine Übertragung", () => {
    for (const line of [
      // Digitales COVID-Zertifikat der EU
      "HC1:NCFOXN%TS3DH3ZSUZK+.V0ETD%65NL-AH-R6IOOK.IR9B+9G4G50PHZF0AT4V22F/8X*G3M9",
      "Hallo",
      "IP:",
      "IP:1:1/1:ABC:QED8WEX0:12345678",
      "IP:1:3/2:ABCDEF:QED8WEX0:12345678",
      "IP:1:0/2:ABCDEF:QED8WEX0:12345678",
      "IP:1:1/100:ABCDEF:QED8WEX0:12345678",
      "IP:1:1/1:ABCDEF::12345678",
      "IP:1:1/1:ABCDEF:QED8WEX0:1234567",
      "IP:1:1/1:abcdef:QED8WEX0:12345678",
      "IP:x:1/1:ABCDEF:QED8WEX0:12345678",
      "IP:0:1/1:ABCDEF:QED8WEX0:12345678",
    ]) {
      expect(
        errorCode(() => addPart(null, line)),
        line,
      ).toBe("notTransfer");
    }
  });

  it("Version 2 stammt aus einer neueren App", () => {
    const [line] = packParts(
      { i: "TEST01", c: CREATED_AT, e: [] },
      { version: 2 },
    );
    expect(errorCode(() => addPart(null, line))).toBe("tooNew");
    expect(errorCode(() => addPart(null, "IP:2:ganz anders aufgebaut"))).toBe(
      "tooNew",
    );
  });
});

describe("Inhalt der Übertragung", () => {
  const read = (wire: unknown, options?: { id?: string }) =>
    readTransferText(packParts(wire, options).join("\n"));

  it("liest gepackte Daten wie encodeTransfer", () => {
    expect(
      read({ i: "TEST01", c: CREATED_AT, e: [["2016-12", "shingrix"]] }),
    ).toEqual({
      payload: {
        id: "TEST01",
        createdAt: CREATED_AT,
        entries: [
          {
            date: "2016-12-01",
            datePrecision: "month",
            productId: "shingrix",
            label: "Shingrix",
            diseases: ["zoster"],
          },
        ],
      },
    });
  });

  it("unbekannter Impfstoff oder unbekannte Krankheit stammt aus einer neueren App", () => {
    expect(
      errorCode(() =>
        read({
          i: "TEST01",
          c: CREATED_AT,
          e: [["2016-12-05", "neuvax-2030"]],
        }),
      ),
    ).toBe("tooNew");
    expect(
      errorCode(() =>
        read({
          i: "TEST01",
          c: CREATED_AT,
          e: [["2016-12-05", 0, "Neue Impfung", ["tetanus", "neue_krankheit"]]],
        }),
      ),
    ).toBe("tooNew");
  });

  it("ungültige Inhalte sind beschädigt", () => {
    const entry = (e: unknown[]) => ({ i: "TEST01", c: CREATED_AT, e: [e] });
    const longText = "x".repeat(501);
    for (const wire of [
      entry(["2016-02-30", "shingrix"]),
      entry(["16-02", "shingrix"]),
      entry(["2016-1", "shingrix"]),
      entry(["2016-13", "shingrix"]),
      entry(["2016-12-05"]),
      entry(["2016-12-05", 0, "Tetanus"]),
      entry(["2016-12-05", 0, "Tetanus", []]),
      entry(["2016-12-05", "shingrix", ""]),
      entry(["2016-12-05", "shingrix", longText]),
      entry(["2016-12-05", "shingrix", 0, 0, longText]),
      entry(["2016-12-05", "shingrix", 0, 0, 0, 0, 0, 0]),
      entry(["2016-12-05", "shingrix", 1]),
      { i: "TEST01", c: "gestern", e: [] },
      { i: "TEST01", c: CREATED_AT },
      { i: "TEST01", c: CREATED_AT, e: Array(2001).fill(["2016", "shingrix"]) },
      [1, 2, 3],
      "Hallo",
    ]) {
      expect(
        errorCode(() => read(wire)),
        JSON.stringify(wire).slice(0, 80),
      ).toBe("corrupt");
    }
  });

  it("2000 Einträge und Texte mit 500 Zeichen sind erlaubt", () => {
    const many = read({
      i: "TEST01",
      c: CREATED_AT,
      e: Array(2000).fill(["2016", "shingrix"]),
    });
    expect("payload" in many && many.payload.entries).toHaveLength(2000);

    const text = "x".repeat(500);
    const long = read({
      i: "TEST01",
      c: CREATED_AT,
      e: [["2016", "shingrix", text, 0, text, text, text]],
    });
    expect("payload" in long && long.payload.entries[0]).toEqual({
      date: "2016-01-01",
      datePrecision: "year",
      productId: "shingrix",
      label: text,
      diseases: ["zoster"],
      batch: text,
      doctor: text,
      note: text,
    });
  });

  it("ID im Inhalt muss zur ID der Zeilen passen", () => {
    expect(
      errorCode(() =>
        read({ i: "OTHER1", c: CREATED_AT, e: [] }, { id: "TEST01" }),
      ),
    ).toBe("corrupt");
  });

  it("entpackt höchstens MAX_TRANSFER_BYTES", () => {
    const wire = (fill: number) => ({
      i: "TEST01",
      c: CREATED_AT,
      e: [],
      x: "A".repeat(fill),
    });
    const overhead = JSON.stringify(wire(0)).length;
    expect(read(wire(MAX_TRANSFER_BYTES - overhead))).toEqual({
      payload: { id: "TEST01", createdAt: CREATED_AT, entries: [] },
    });
    expect(errorCode(() => read(wire(MAX_TRANSFER_BYTES - overhead + 1)))).toBe(
      "corrupt",
    );
  });
});

it("TransferError trägt Code und Meldung für Anwender", () => {
  const e = new TransferError("tooNew");
  expect(e.code).toBe("tooNew");
  expect(e.message).toBe(T.transfer.errors.tooNew);
  expect(T.transfer.errors.corrupt).toBe(
    "Die Übertragung ist beschädigt. Erzeuge sie am PC neu.",
  );
});
