import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorageUnavailableError } from "@/core/storage/repository";
import { App } from "./App";

it("zeigt den App-Namen", async () => {
  render(<App />);
  expect(await screen.findByText("ImpfPass")).toBeTruthy();
});

it("ohne Person erscheint die Ersteinrichtung, danach die Übersicht", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(
    await screen.findByRole("heading", { name: "Übersicht" }),
  ).toBeTruthy();
});

it("die angelegte Person bleibt nach einem Neustart erhalten", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Übersicht" });
  unmount();

  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Übersicht" }),
  ).toBeTruthy();
  expect(screen.queryByLabelText("Name")).toBeNull();
});

it("Geburtsdatum in der Zukunft wird abgelehnt", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "2999-01-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(
    await screen.findByText("Das Geburtsdatum liegt in der Zukunft."),
  ).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Übersicht" })).toBeNull();
});

it("Name und Geburtsdatum sind Pflicht", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Weiter" }));
  expect(await screen.findByText("Bitte gib einen Namen ein.")).toBeTruthy();
  expect(screen.getByText("Bitte gib das Geburtsdatum ein.")).toBeTruthy();
});

it("ohne Speicher erscheint eine verständliche Meldung", async () => {
  render(<App open={() => Promise.reject(new StorageUnavailableError())} />);
  expect(
    await screen.findByText(/kann auf diesem Gerät keine Daten speichern/),
  ).toBeTruthy();
});

it("untere Navigation führt zu den Bereichen", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Übersicht" });

  const nav = screen.getByRole("navigation");
  await user.click(
    Array.from(nav.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Einstellungen"),
    )!,
  );
  expect(
    await screen.findByRole("heading", { name: "Einstellungen" }),
  ).toBeTruthy();
  expect(window.location.hash).toBe("#/einstellungen");
});
