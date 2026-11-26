import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createBackup, serializeBackup } from "@/core/formats/backup";
import { DEFAULT_SETTINGS } from "@/core/model";
import { openRepository } from "@/core/storage/repository";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { RestoreButton } from "./RestoreButton";

function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]')!;
}

it("kaputte Datei: Fehlermeldung, Daten unverändert", async () => {
  await seed({ vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<RestoreButton />);

  await user.upload(
    fileInput(),
    new File(["hallo"], "kaputt.json", { type: "application/json" }),
  );

  expect(
    await screen.findByText("Diese Datei ist keine ImpfPass-Sicherung."),
  ).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(data().vaccinations.map((v) => v.id)).toEqual(["v1"]);
  const repo = await openRepository();
  expect((await repo.getVaccinations("p1")).map((v) => v.id)).toEqual(["v1"]);
});

it("gültige Datei: Rückfrage, dann ersetzt", async () => {
  await seed({ vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<RestoreButton />);

  const other = createBackup(
    {
      persons: [testPerson({ id: "p9", name: "Hans" })],
      vaccinations: [
        testVaccination({ id: "v9", personId: "p9" }),
        testVaccination({ id: "v10", personId: "p9", date: "2021-01-01" }),
      ],
      decisions: [],
      settings: DEFAULT_SETTINGS,
    },
    new Date("2026-11-20T09:00:00Z"),
  );
  await user.upload(
    fileInput(),
    new File([serializeBackup(other)], "sicherung.json", {
      type: "application/json",
    }),
  );

  const dialog = await screen.findByRole("alertdialog");
  expect(
    screen.getByText(
      "Alle Daten auf diesem Gerät durch die Sicherung ersetzen?",
    ),
  ).toBeTruthy();
  expect(dialog.textContent).toContain("20.11.2026");
  expect(dialog.textContent).toContain("2 Impfungen");
  expect(data().person?.name).toBe("Christa");

  await user.click(screen.getByRole("button", { name: "Ersetzen" }));

  await waitFor(() => expect(data().person?.name).toBe("Hans"));
  expect(
    data()
      .vaccinations.map((v) => v.id)
      .sort(),
  ).toEqual(["v10", "v9"]);
  expect(
    await screen.findByText("Die Sicherung wurde wiederhergestellt."),
  ).toBeTruthy();
});

it("gültige Datei: Abbrechen lässt alles, wie es ist", async () => {
  await seed({ vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<RestoreButton />);
  const other = createBackup(
    {
      persons: [testPerson({ id: "p9", name: "Hans" })],
      vaccinations: [],
      decisions: [],
      settings: DEFAULT_SETTINGS,
    },
    new Date("2026-11-20T09:00:00Z"),
  );
  await user.upload(
    fileInput(),
    new File([serializeBackup(other)], "sicherung.json"),
  );
  await screen.findByRole("alertdialog");
  await user.click(screen.getByRole("button", { name: "Abbrechen" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(data().person?.name).toBe("Christa");
  expect(data().vaccinations.map((v) => v.id)).toEqual(["v1"]);
});

it("Wiederherstellen übernimmt keine Geräte-Einstellungen aus der Sicherung", async () => {
  await seed({
    vaccinations: [testVaccination()],
    settings: { ...DEFAULT_SETTINGS, listSort: "date-asc" },
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<RestoreButton />);
  const other = createBackup(
    {
      persons: [testPerson({ id: "p9", name: "Hans" })],
      vaccinations: [],
      decisions: [],
      settings: {
        ...DEFAULT_SETTINGS,
        listSort: "disease",
        installHintDismissed: true,
        lastBackupAt: "2020-01-01T08:00:00.000Z",
      },
    },
    new Date("2026-11-20T09:00:00Z"),
  );
  await user.upload(
    fileInput(),
    new File([serializeBackup(other)], "sicherung.json"),
  );
  await screen.findByRole("alertdialog");
  await user.click(screen.getByRole("button", { name: "Ersetzen" }));

  await waitFor(() => expect(data().person?.name).toBe("Hans"));
  // Sortierung kommt aus der Sicherung, der Installationshinweis gehört zum Gerät,
  // und die Daten auf dem Gerät entsprechen jetzt genau dieser Sicherung.
  expect(data().settings.listSort).toBe("disease");
  expect(data().settings.installHintDismissed).toBeUndefined();
  expect(data().settings.lastBackupAt).toBe("2026-11-20T09:00:00.000Z");
  const repo = await openRepository();
  expect((await repo.getSettings()).installHintDismissed).toBeUndefined();
});
