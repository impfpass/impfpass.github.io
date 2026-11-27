import type { Recommendation } from "@/core/rules/types";
import { statusText } from "./statusText";

function rec(p: Partial<Recommendation>): Recommendation {
  return {
    id: "td",
    diseases: [],
    status: "due",
    dueDate: null,
    latestDate: null,
    dose: null,
    timing: "normal",
    reason: { kind: "none" },
    source: {
      edition: "x",
      date: "2026-01-01",
      section: "x",
      page: null,
      url: "",
    },
    ...p,
  };
}
const season = { kind: "season", label: "2026/27" } as const;

it.each<[string, Partial<Recommendation>, string]>([
  [
    "overdue normal",
    { status: "overdue", dueDate: "2024-03-01" },
    "überfällig seit 03/2024",
  ],
  ["due normal", { status: "due" }, "jetzt fällig"],
  [
    "due follow_up",
    { status: "due", timing: "follow_up", dose: { number: 2, of: 3 } },
    "2. Dosis fällig",
  ],
  [
    "overdue follow_up mit spätestens",
    {
      status: "overdue",
      timing: "follow_up",
      dose: { number: 2, of: 3 },
      latestDate: "2027-05-01",
    },
    "2. Dosis fällig, spätestens 05/2027",
  ],
  [
    "due season",
    { status: "due", timing: "season", reason: season },
    "für die Saison 2026/27 noch offen",
  ],
  [
    "soon normal",
    { status: "soon", dueDate: "2027-03-01" },
    "fällig ab 03/2027",
  ],
  [
    "soon follow_up",
    {
      status: "soon",
      timing: "follow_up",
      dose: { number: 3, of: 3 },
      dueDate: "2027-03-01",
    },
    "3. Dosis ab 03/2027",
  ],
  [
    "soon season",
    {
      status: "soon",
      timing: "season",
      reason: season,
      dueDate: "2027-09-01",
    },
    "für die Saison 2026/27 ab 09/2027",
  ],
  [
    "protected season",
    { status: "protected", timing: "season", reason: season },
    "für die Saison 2026/27 geimpft",
  ],
  [
    "protected mit Datum",
    { status: "protected", dueDate: "2030-06-01" },
    "geschützt bis 06/2030",
  ],
  [
    "protected ohne Datum",
    { status: "protected" },
    "geschützt, keine Auffrischung nötig",
  ],
  [
    "future season",
    { status: "future", timing: "season", dueDate: "2027-09-01" },
    "nächste Saison ab 09/2027",
  ],
  [
    "future age",
    {
      status: "future",
      reason: { kind: "age", age: 60 },
      dueDate: "2030-01-01",
    },
    "ab 60 Jahren, also ab 01/2030",
  ],
  ["future sonst", { status: "future", dueDate: "2030-01-01" }, "ab 01/2030"],
])("%s", (_name, p, text) => {
  expect(statusText(rec(p))).toBe(text);
});

it("im Detail mit Tag", () => {
  expect(
    statusText(rec({ status: "soon", dueDate: "2027-03-05" }), "day"),
  ).toBe("fällig ab 05.03.2027");
});
