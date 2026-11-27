import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DISEASE_IDS, DISEASES } from "@/core/catalog/diseases";
import { DiseasePicker } from "./DiseasePicker";

it("zeigt die Anzahl im Knopf, mit Zeilennummer im Namen", () => {
  render(
    <DiseasePicker
      value={["tetanus", "measles"]}
      onChange={() => {}}
      rowNumber={3}
    />,
  );
  const trigger = screen.getByRole("button", {
    name: "Krankheiten wählen (2), Zeile 3",
  });
  expect(trigger.textContent).toBe("Krankheiten wählen (2)");
});

it("zeigt im Dialog alle Krankheiten als Kästchen, die gewählten angehakt", async () => {
  render(
    <DiseasePicker value={["measles"]} onChange={() => {}} rowNumber={1} />,
  );
  await userEvent.click(screen.getByRole("button", { name: /Krankheiten/ }));
  expect(
    screen.getByRole("dialog", { name: "Krankheiten für Zeile 1" }),
  ).toBeTruthy();
  expect(screen.getAllByRole("checkbox")).toHaveLength(DISEASE_IDS.length);
  for (const id of DISEASE_IDS) {
    expect(
      screen.getByRole("checkbox", { name: DISEASES[id].name }),
    ).toBeTruthy();
  }
  expect(
    screen
      .getByRole("checkbox", { name: "Masern" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  expect(
    screen
      .getByRole("checkbox", { name: "Tetanus" })
      .getAttribute("aria-checked"),
  ).toBe("false");
});

it("übernimmt die Auswahl in der Reihenfolge der Krankheitsliste", async () => {
  const onChange = vi.fn();
  render(<DiseasePicker value={[]} onChange={onChange} rowNumber={1} />);
  await userEvent.click(screen.getByRole("button", { name: /Krankheiten/ }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Masern" }));
  await userEvent.click(screen.getByLabelText("Tetanus"));
  await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
  expect(onChange).toHaveBeenCalledWith(["tetanus", "measles"]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("Abbrechen ändert nichts und verwirft die Auswahl", async () => {
  const onChange = vi.fn();
  render(
    <DiseasePicker value={["measles"]} onChange={onChange} rowNumber={1} />,
  );
  const trigger = screen.getByRole("button", { name: /Krankheiten/ });
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole("checkbox", { name: "Masern" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Mumps" }));
  await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();

  await userEvent.click(trigger);
  expect(
    screen
      .getByRole("checkbox", { name: "Masern" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  expect(
    screen
      .getByRole("checkbox", { name: "Mumps" })
      .getAttribute("aria-checked"),
  ).toBe("false");
});
