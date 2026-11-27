import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithData, seed } from "@/test/helpers";
import { InstallHint } from "./InstallHint";

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

afterEach(() => {
  vi.restoreAllMocks();
});

it("Wegklicken merkt sich die Entscheidung", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(iphone);
  await seed({});
  const user = userEvent.setup();
  const { data } = await renderWithData(<InstallHint />);

  expect(screen.getByText(/Zum Home-Bildschirm/)).toBeTruthy();
  // Die App auf dem Home-Bildschirm hat einen eigenen Speicher.
  expect(screen.getByText(/eigenen Speicher/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Hinweis ausblenden" }));

  await waitFor(() => expect(data().settings.installHintDismissed).toBe(true));
  expect(screen.queryByText(/Zum Home-Bildschirm/)).toBeNull();
});

it("fehlgeschlagenes Speichern beim Ausblenden wird gemeldet", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(iphone);
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<InstallHint />);
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
    throw new DOMException("voll", "QuotaExceededError");
  });

  await user.click(screen.getByRole("button", { name: "Hinweis ausblenden" }));

  expect((await screen.findByRole("alert")).textContent).toContain(
    "Speichern hat nicht geklappt",
  );
});

it("erscheint nicht am PC", async () => {
  await seed({});
  await renderWithData(<InstallHint />);
  expect(screen.queryByText(/Zum Home-Bildschirm/)).toBeNull();
});
