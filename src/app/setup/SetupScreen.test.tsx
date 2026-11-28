import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openRepository } from "@/core/storage/repository";
import { App } from "../App";

it("scheitert das Anlegen in Schritt 3, bleibt die Wahl mit einem Hinweis", async () => {
  const savePerson = vi.fn().mockRejectedValue(new Error("kaputt"));
  const user = userEvent.setup();
  render(
    <App
      open={async (events) => ({
        ...(await openRepository(events)),
        savePerson,
      })}
    />,
  );
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await user.click(await screen.findByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Wie möchtest du anfangen?" });

  await user.click(
    screen.getByRole("button", { name: "Einträge selbst eingeben" }),
  );

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Speichern hat nicht geklappt. Bitte versuche es noch einmal.",
  );
  expect(savePerson).toHaveBeenCalledOnce();
  expect(savePerson.mock.calls[0][0]).toMatchObject({
    name: "Christa",
    birthDate: "1967-03-01",
  });
  expect(
    screen.getByRole("heading", { name: "Wie möchtest du anfangen?" }),
  ).toBeTruthy();
  expect(await (await openRepository()).getPersons()).toEqual([]);
  // Nach dem Fehler lässt sich jede Wahl wieder treffen.
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Einträge selbst eingeben",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  for (const name of ["Alte Impfungen vom PC übernehmen", "Zurück"]) {
    expect(
      (screen.getByRole("button", { name }) as HTMLButtonElement).disabled,
    ).toBe(false);
  }

  // Ein zweiter Versuch ruft das Anlegen erneut auf.
  savePerson.mockResolvedValueOnce(undefined);
  await user.click(
    screen.getByRole("button", { name: "Alte Impfungen vom PC übernehmen" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Impfungen übernehmen" }),
  ).toBeTruthy();
  expect(savePerson).toHaveBeenCalledTimes(2);
});
