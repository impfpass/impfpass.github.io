import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openRepository } from "@/core/storage/repository";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { EntryForm } from "./EntryForm";

it("Impfstoff aus Vorschlägen wählen zeigt die Krankheiten und speichert", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<EntryForm />, "/impfungen/neu");

  await user.type(screen.getByLabelText("Impfstoff"), "Boos");
  await user.click(screen.getByRole("button", { name: "Boostrix Polio" }));
  expect(
    screen.getByText("Tetanus, Diphtherie, Keuchhusten, Kinderlähmung (Polio)"),
  ).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Speichern" }));

  await waitFor(() => expect(data().vaccinations).toHaveLength(1));
  const saved = data().vaccinations[0];
  expect(saved).toMatchObject({
    personId: "p1",
    productId: "boostrix-polio",
    label: "Boostrix Polio",
    diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
    datePrecision: "day",
    source: "manual",
  });
  const repo = await openRepository();
  expect(await repo.getVaccinations("p1")).toHaveLength(1);
  expect(await screen.findByText("Sicherung speichern?")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Jetzt sichern" })).toBeTruthy();
});

it("Freitext ohne Impfstoff verlangt Krankheiten", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<EntryForm />, "/impfungen/neu");

  await user.type(screen.getByLabelText("Impfstoff"), "Tetanus-Impfung");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(
    await screen.findByText(
      "Bitte einen Impfstoff wählen oder mindestens eine Krankheit angeben.",
    ),
  ).toBeTruthy();
  expect(data().vaccinations).toHaveLength(0);

  await user.click(screen.getByRole("checkbox", { name: "Tetanus" }));
  await user.click(screen.getByRole("button", { name: "Speichern" }));

  await waitFor(() => expect(data().vaccinations).toHaveLength(1));
  expect(data().vaccinations[0]).toMatchObject({
    productId: null,
    label: "Tetanus-Impfung",
    diseases: ["tetanus"],
  });
});

it("nur das Jahr bekannt: gespeichert wird der 1. Januar", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<EntryForm />, "/impfungen/neu");

  await user.click(screen.getByRole("radio", { name: "nur Jahr" }));
  // Bei „nur Jahr“ geht es fast immer um alte Einträge: Feld leer, direkt tippen
  const yearInput = screen.getByLabelText("Jahr") as HTMLInputElement;
  expect(yearInput.value).toBe("");
  await user.type(yearInput, "1975");
  await user.type(screen.getByLabelText("Impfstoff"), "Pocken");
  await user.click(screen.getByRole("button", { name: "Pocken-Impfstoff" }));
  await user.click(screen.getByRole("button", { name: "Speichern" }));

  await waitFor(() => expect(data().vaccinations).toHaveLength(1));
  expect(data().vaccinations[0]).toMatchObject({
    date: "1975-01-01",
    datePrecision: "year",
    productId: "pocken",
    diseases: ["smallpox"],
  });
});

it("Datum vor dem Geburtstag wird abgelehnt", async () => {
  await seed({ persons: [testPerson({ birthDate: "1967-03-15" })] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<EntryForm />, "/impfungen/neu");

  const date = screen.getByLabelText("Datum");
  await user.clear(date);
  await user.type(date, "1960-01-01");
  await user.type(screen.getByLabelText("Impfstoff"), "Td-pur");
  await user.click(screen.getByRole("button", { name: "Speichern" }));

  expect(
    await screen.findByText("Das Datum liegt vor deinem Geburtstag."),
  ).toBeTruthy();
  expect(data().vaccinations).toHaveLength(0);
});

it("Bearbeiten ändert den vorhandenen Eintrag", async () => {
  const existing = testVaccination({ batch: "AB12" });
  await seed({ persons: [testPerson()], vaccinations: [existing] });
  const user = userEvent.setup();
  const { data } = await renderWithData(
    <EntryForm existing={existing} />,
    "/impfungen/v1/bearbeiten",
  );

  const batch = screen.getByLabelText("Charge");
  expect((batch as HTMLInputElement).value).toBe("AB12");
  await user.clear(batch);
  await user.type(batch, "CD34");
  await user.click(screen.getByRole("button", { name: "Speichern" }));

  await waitFor(() => expect(data().vaccinations[0].batch).toBe("CD34"));
  expect(data().vaccinations).toHaveLength(1);
  expect(data().vaccinations[0].id).toBe("v1");
  expect(data().vaccinations[0].createdAt).toBe(existing.createdAt);
  expect(await screen.findByText("Sicherung speichern?")).toBeTruthy();
});

it("beim Wechsel der Genauigkeit bleiben Jahr und Monat des eingegebenen Datums", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  await renderWithData(<EntryForm />, "/impfungen/neu");

  const day = screen.getByLabelText("Datum");
  await user.clear(day);
  await user.type(day, "2016-12-05");
  await user.click(screen.getByRole("radio", { name: "nur Monat" }));
  expect((screen.getByLabelText("Monat") as HTMLInputElement).value).toBe(
    "2016-12",
  );
  await user.click(screen.getByRole("radio", { name: "nur Jahr" }));
  expect((screen.getByLabelText("Jahr") as HTMLInputElement).value).toBe(
    "2016",
  );
});

it("ein genau erkannter Name lässt längere Namen weiter zur Auswahl", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  await renderWithData(<EntryForm />, "/impfungen/neu");

  await user.type(screen.getByLabelText("Impfstoff"), "Boostrix");
  expect(screen.getByText("Tetanus, Diphtherie, Keuchhusten")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Boostrix Polio" }));
  expect(
    screen.getByText("Tetanus, Diphtherie, Keuchhusten, Kinderlähmung (Polio)"),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Boostrix Polio" })).toBeNull();
});

it("bei Fehlern springt der Fokus ins Feld, die Meldung hängt am Feld", async () => {
  await seed({ persons: [testPerson({ birthDate: "1967-03-15" })] });
  const user = userEvent.setup();
  await renderWithData(<EntryForm />, "/impfungen/neu");

  await user.click(screen.getByRole("button", { name: "Speichern" }));

  const product = screen.getByLabelText("Impfstoff");
  expect(document.activeElement).toBe(product);
  const describedBy = product.getAttribute("aria-describedby") ?? "";
  const messages = describedBy
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent);
  expect(messages.join(" ")).toContain(
    screen.getByText(/Bitte einen Impfstoff/).textContent,
  );

  const date = screen.getByLabelText("Datum");
  await user.clear(date);
  await user.type(date, "1960-01-01");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(document.activeElement).toBe(date);
});

it("Monatsfeld nennt das Format für Browser ohne Monatsauswahl", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<EntryForm />, "/impfungen/neu");
  await user.click(screen.getByRole("radio", { name: "nur Monat" }));
  expect(screen.getByLabelText("Monat").getAttribute("placeholder")).toBe(
    "JJJJ-MM",
  );
});

it("„Arzt oder Praxis“ ohne Autokorrektur und Rechtschreibprüfung", async () => {
  // Arztnamen korrigiert das iPhone sonst in andere Wörter um.
  await seed({ persons: [testPerson()] });
  await renderWithData(<EntryForm />, "/impfungen/neu");
  const doctor = screen.getByLabelText("Arzt oder Praxis");
  expect(doctor.getAttribute("autocorrect")).toBe("off");
  expect(doctor.getAttribute("spellcheck")).toBe("false");
});
