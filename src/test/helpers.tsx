import type { ReactNode } from "react";
import { render, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AppDataProvider, useAppData, type AppData } from "@/app/data/AppData";
import {
  DEFAULT_ANSWERS,
  DEFAULT_SETTINGS,
  type Person,
  type Settings,
  type Vaccination,
} from "@/core/model";
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
}) {
  const repo = await openRepository();
  for (const p of data.persons ?? [testPerson()]) await repo.savePerson(p);
  for (const v of data.vaccinations ?? []) await repo.saveVaccination(v);
  await repo.saveSettings(data.settings ?? DEFAULT_SETTINGS);
  return repo;
}

/**
 * Rendert einen Bildschirm mit echter Datenanbindung und Hash-Routing.
 * `data()` liefert den jeweils aktuellen Stand von useAppData.
 */
export async function renderWithData(ui: ReactNode, route = "/") {
  window.location.hash = route;
  let latest: AppData | null = null;
  function Probe() {
    latest = useAppData();
    return null;
  }
  const result = render(
    <AppDataProvider>
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
