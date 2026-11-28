import type { ReactNode } from "react";
import { render, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AppDataProvider, useAppData, type AppData } from "@/app/data/AppData";
import {
  DEFAULT_ANSWERS,
  DEFAULT_SETTINGS,
  type Decision,
  type GtdState,
  type ISODate,
  type Person,
  type RuleState,
  type Settings,
  type Vaccination,
} from "@/core/model";
import type { Rulebook } from "@/core/rules/types";
import { openRepository } from "@/core/storage/repository";

export function testPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "p1",
    name: "Christa",
    birthDate: "1967-03-15",
    answers: DEFAULT_ANSWERS,
    createdAt: "2026-11-26T10:00:00.000Z",
    ...overrides,
  };
}

export function testVaccination(
  overrides: Partial<Vaccination> = {},
): Vaccination {
  return {
    id: "v1",
    personId: "p1",
    date: "2020-05-04",
    datePrecision: "day",
    productId: "boostrix-polio",
    label: "Boostrix Polio",
    diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
    source: "manual",
    createdAt: "2026-11-26T10:00:00.000Z",
    updatedAt: "2026-11-26T10:00:00.000Z",
    ...overrides,
  };
}

/** Schreibt Testdaten in die (frische) fake-IndexedDB. */
export async function seed(data: {
  persons?: Person[];
  vaccinations?: Vaccination[];
  settings?: Settings;
  decisions?: Decision[];
  ruleStates?: RuleState[];
  gtdStates?: GtdState[];
}) {
  const repo = await openRepository();
  for (const p of data.persons ?? [testPerson()]) await repo.savePerson(p);
  for (const v of data.vaccinations ?? []) await repo.saveVaccination(v);
  for (const d of data.decisions ?? []) await repo.saveDecision(d);
  for (const s of data.ruleStates ?? []) await repo.saveRuleState(s);
  for (const s of data.gtdStates ?? []) await repo.saveGtdState(s);
  await repo.saveSettings(data.settings ?? DEFAULT_SETTINGS);
  return repo;
}

/**
 * Rendert einen Bildschirm mit echter Datenanbindung und Hash-Routing.
 * `data()` liefert den jeweils aktuellen Stand von useAppData.
 * `options` geht an den Provider (Test-Regelwerk, fester Tag).
 */
export async function renderWithData(
  ui: ReactNode,
  route = "/",
  options: { rulebook?: Rulebook; today?: ISODate } = {},
) {
  window.location.hash = route;
  let latest: AppData | null = null;
  function Probe() {
    latest = useAppData();
    return null;
  }
  const result = render(
    <AppDataProvider rulebook={options.rulebook} today={options.today}>
      <Router hook={useHashLocation}>
        {ui}
        <Probe />
      </Router>
    </AppDataProvider>,
  );
  const data = () => {
    if (!latest) throw new Error("AppData noch nicht gerendert");
    return latest;
  };
  await waitFor(() => expect(data().status).toBe("ready"));
  return { ...result, data };
}
