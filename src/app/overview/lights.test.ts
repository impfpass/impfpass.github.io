import { testVaccination } from "@/test/helpers";
import type { Recommendation } from "@/core/rules/types";
import { groupForOverview, lightOf } from "./lights";

function rec(
  id: Recommendation["id"],
  status: Recommendation["status"],
  timing: Recommendation["timing"] = "normal",
  diseases: Recommendation["diseases"] = [],
): Recommendation {
  return {
    id,
    diseases,
    status,
    dueDate: null,
    latestDate: null,
    dose: null,
    timing,
    reason: { kind: "none" },
    source: {
      edition: "x",
      date: "2026-01-01",
      section: "x",
      page: null,
      url: "",
    },
  };
}

it.each([
  ["overdue", "normal", "red"],
  ["due", "normal", "red"],
  ["due", "follow_up", "red"],
  ["due", "season", "yellow"],
  ["soon", "normal", "yellow"],
  ["protected", "normal", "green"],
  ["future", "normal", "grey"],
  ["discuss", "normal", null],
  ["declined", "normal", null],
  ["not_needed", "normal", null],
  ["not_applicable", "normal", null],
] as const)("%s/%s → %s", (status, timing, light) => {
  expect(lightOf(rec("td", status, timing))).toBe(light);
});

it("Gruppen sind alphabetisch, Reiseimpfungen landen unter „Weitere Impfungen“", () => {
  const groups = groupForOverview(
    [
      rec("zoster", "due"),
      rec("covid19", "overdue"),
      rec("td", "due", "normal", ["tetanus", "diphtheria"]),
      rec("mmr", "discuss"),
      rec("rsv", "declined"),
      rec("tbe", "not_applicable", "normal", ["tbe"]),
    ],
    [
      testVaccination({
        id: "gf",
        productId: null,
        label: "Gelbfieber",
        diseases: ["yellow_fever"],
      }),
      testVaccination({ id: "td", diseases: ["tetanus", "diphtheria"] }),
    ],
  );
  expect(groups.red.map((r) => r.id)).toEqual(["covid19", "zoster", "td"]);
  expect(groups.discuss.map((r) => r.id)).toEqual(["mmr"]);
  expect(groups.hidden.map((r) => r.id)).toEqual(["rsv"]);
  expect(groups.others.map((o) => o.disease)).toEqual(["yellow_fever"]);
});
