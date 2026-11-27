import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AppDataProvider } from "@/app/data/AppData";
import { DEFAULT_ANSWERS } from "@/core/model";
import { RULEBOOK } from "@/core/rules/rulebook";
import { openRepository } from "@/core/storage/repository";
import { seed, testPerson, testVaccination } from "@/test/helpers";
import { OverviewScreen } from "./OverviewScreen";

const ALERT = "Speichern hat nicht geklappt. Bitte versuche es noch einmal.";

/** Rendert die Übersicht mit einem Speicher, dessen Schreibzugriffe scheitern. */
async function renderFailing() {
  window.location.hash = "/";
  const fail = () => Promise.reject(new Error("kaputt"));
  render(
    <AppDataProvider
      today="2026-11-27"
      open={async (events) => ({
        ...(await openRepository(events)),
        saveDecision: fail,
        savePerson: fail,
        saveRuleState: fail,
      })}
    >
      <Router hook={useHashLocation}>
        <OverviewScreen />
      </Router>
    </AppDataProvider>,
  );
  await screen.findByRole("heading", { name: "Übersicht" });
}

it("Karte „Mit dem Arzt besprechen“ zeigt einen Fehler, wenn Speichern scheitert", async () => {
  await seed({
    persons: [
      testPerson({
        birthDate: "1976-05-10",
        answers: { ...DEFAULT_ANSWERS, chronicIllness: true },
      }),
    ],
  });
  await renderFailing();
  await userEvent.click(
    (
      await screen.findAllByRole("button", { name: "Arzt empfiehlt sie mir" })
    )[0],
  );
  expect((await screen.findByRole("alert")).textContent).toBe(ALERT);
});

it("FSME-Nachfrage zeigt einen Fehler, wenn Speichern scheitert", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [
      testVaccination({
        id: "f",
        date: "2020-01-01",
        productId: null,
        label: "FSME",
        diseases: ["tbe"],
      }),
    ],
  });
  await renderFailing();
  await userEvent.click(await screen.findByRole("button", { name: "Nein" }));
  expect((await screen.findByRole("alert")).textContent).toBe(ALERT);
  await userEvent.click(screen.getByRole("button", { name: "Ja, erinnern" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe(ALERT),
  );
});

it("Hinweise zeigen einen Fehler, wenn „Verstanden“ nicht gespeichert wird", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    ruleStates: [
      {
        personId: "p1",
        seenVersion: RULEBOOK.version,
        snapshot: [],
        notices: [
          {
            kind: "new",
            recommendationId: "rsv",
            text: "Neue RSV-Empfehlung.",
            validSince: "2026-10-01",
          },
        ],
      },
    ],
  });
  await renderFailing();
  await userEvent.click(
    await screen.findByRole("button", { name: "Verstanden" }),
  );
  expect((await screen.findByRole("alert")).textContent).toBe(ALERT);
});
