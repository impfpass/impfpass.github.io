import { useEffect, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PRODUCTS } from "@/core/catalog/products";
import {
  emptyDraft,
  newRow,
  withLabel,
  type Draft,
  type DraftRow,
} from "@/core/import/draft";
import { DraftTable } from "./DraftTable";

let nextId = 0;
const row = (
  date = "05.12.2016",
  label = "Boostrix Polio",
  extra: Partial<DraftRow> = {},
): DraftRow => withLabel({ ...newRow(`r${++nextId}`), date, ...extra }, label);
/** Eine Zeile mit „Hinweise geprüft“; withLabel setzt es sonst zurück. */
const reviewedRow = (date: string, label: string): DraftRow => ({
  ...row(date, label),
  reviewed: true,
});

/** Rendert die Tabelle mit eigenem Zustand; `state.draft` ist der aktuelle Entwurf. */
function setup(rows: DraftRow[], birthDate = "") {
  const onNext = vi.fn();
  const state: { draft: Draft } = {
    draft: { ...emptyDraft(new Date()), birthDate, rows },
  };
  function Harness() {
    const [draft, setDraft] = useState(state.draft);
    useEffect(() => {
      state.draft = draft;
    });
    return <DraftTable draft={draft} update={setDraft} onNext={onNext} />;
  }
  render(<Harness />);
  return { onNext, state };
}

/** Zeile n der Tabelle (1-basiert, ohne Kopfzeile). */
const tableRow = (n: number) => screen.getAllByRole("row")[n];
const bodyRows = () => screen.getAllByRole("row").slice(1);
const input = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const nextButton = () =>
  screen.getByRole("button", {
    name: "Weiter zum Übertragen",
  }) as HTMLButtonElement;

describe("Spalten und Felder", () => {
  it("zeigt alle Spalten", () => {
    setup([row()]);
    expect(
      screen.getAllByRole("columnheader").map((h) => h.textContent),
    ).toEqual([
      "Nr.",
      "Datum",
      "Impfstoff",
      "Krankheiten",
      "Charge",
      "Arzt oder Praxis",
      "Notiz",
      "Hinweise",
      "Löschen",
    ]);
  });

  it("benennt jedes Feld mit der Zeilennummer", () => {
    setup([
      row("01.02.2010", "Repevax"),
      row("05.12.2016", "Boostrix Polio", {
        batch: "AC52B123AB",
        doctor: "Praxis Dr. Muster",
        note: "linker Arm",
      }),
    ]);
    expect(input("Datum, Zeile 2").value).toBe("05.12.2016");
    expect(input("Impfstoff, Zeile 2").value).toBe("Boostrix Polio");
    expect(input("Charge, Zeile 2").value).toBe("AC52B123AB");
    expect(input("Arzt oder Praxis, Zeile 2").value).toBe("Praxis Dr. Muster");
    expect(input("Notiz, Zeile 2").value).toBe("linker Arm");
    expect(
      screen.getByRole("button", { name: "Löschen, Zeile 2" }),
    ).toBeTruthy();
    expect(within(tableRow(2)).getByRole("rowheader").textContent).toBe("2");
  });

  it("schaltet Autokorrektur für Charge und Arzt oder Praxis ab", () => {
    setup([row()]);
    for (const name of ["Arzt oder Praxis, Zeile 1", "Charge, Zeile 1"]) {
      const field = input(name);
      expect(field.getAttribute("autocorrect")).toBe("off");
      expect(field.getAttribute("spellcheck")).toBe("false");
      expect(field.getAttribute("autocomplete")).toBe("off");
    }
  });

  it("schlägt beim Impfstoff alle Impfstoffnamen vor", () => {
    setup([row()]);
    const listId = input("Impfstoff, Zeile 1").getAttribute("list");
    const options = [
      ...document.querySelectorAll(`datalist[id="${listId}"] option`),
    ].map((o) => o.getAttribute("value"));
    expect(options).toHaveLength(PRODUCTS.length);
    expect(options).toContain("Boostrix Polio");
  });

  it("scrollt bei schmalen Fenstern waagerecht", () => {
    setup([row()]);
    expect(screen.getByRole("table").parentElement?.className).toContain(
      "overflow-x-auto",
    );
  });
});

describe("Fehler und Hinweise", () => {
  it("lässt den Fehler verschwinden, wenn das Datum korrigiert wird", async () => {
    setup([row("31.13.2016")]);
    const error = "Datum nicht lesbar. Schreib TT.MM.JJJJ, MM.JJJJ oder JJJJ.";
    expect(within(tableRow(1)).getByText(error)).toBeTruthy();
    const date = input("Datum, Zeile 1");
    expect(date.getAttribute("aria-invalid")).toBe("true");

    await userEvent.clear(date);
    await userEvent.type(date, "05.12.2016");
    expect(screen.queryByText(error)).toBeNull();
    expect(date.getAttribute("aria-invalid")).not.toBe("true");
  });

  it("kennzeichnet Fehler und Hinweise nicht nur mit Farbe", () => {
    setup([row(""), row("03.04.2018", "Bostrix Polio")]);
    expect(within(tableRow(1)).getByRole("listitem").textContent).toBe(
      "Fehler: Datum fehlt.",
    );
    expect(within(tableRow(2)).getByRole("listitem").textContent).toBe(
      "Hinweis: Gelesen „Bostrix Polio“, erkannt als Boostrix Polio.",
    );
  });

  it("zeigt bei „Boostrix Polio“ die Krankheiten als Text", async () => {
    setup([row("05.12.2016", "")]);
    await userEvent.type(input("Impfstoff, Zeile 1"), "Boostrix Polio");
    const cells = within(tableRow(1)).getAllByRole("cell");
    expect(
      cells.some(
        (c) =>
          c.textContent ===
          "Tetanus, Diphtherie, Keuchhusten, Kinderlähmung (Polio)",
      ),
    ).toBe(true);
    expect(
      within(tableRow(1)).queryByRole("button", { name: /Krankheiten wählen/ }),
    ).toBeNull();
    expect(within(tableRow(1)).queryByRole("listitem")).toBeNull();
  });

  it("meldet bei „Bostrix Polio“ die unscharfe Erkennung", async () => {
    setup([row("05.12.2016", "")]);
    await userEvent.type(input("Impfstoff, Zeile 1"), "Bostrix Polio");
    expect(
      within(tableRow(1)).getByText(
        "Gelesen „Bostrix Polio“, erkannt als Boostrix Polio.",
      ),
    ).toBeTruthy();
  });

  it("zeigt bei mehrdeutigem Namen die Kandidaten, ein Klick wählt einen", async () => {
    setup([row("05.12.2016", "Prevenar")]);
    const r = within(tableRow(1));
    expect(r.getByText("Mehrere Impfstoffe passen:")).toBeTruthy();
    expect(
      r.getByRole("button", { name: "Prevenar 20, Zeile 1" }),
    ).toBeTruthy();
    await userEvent.click(
      r.getByRole("button", { name: "Prevenar 13, Zeile 1" }),
    );
    expect(input("Impfstoff, Zeile 1").value).toBe("Prevenar 13");
    expect(r.queryByText("Mehrere Impfstoffe passen:")).toBeNull();
    expect(r.getByText("Pneumokokken")).toBeTruthy();
  });

  it("ohne Impfstoff beseitigen zwei Krankheiten aus dem Dialog den Fehler", async () => {
    const { state } = setup([row("05.12.2016", "")]);
    const error = "Impfstoff nicht erkannt. Wähle die Krankheiten.";
    expect(within(tableRow(1)).getByText(error)).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Krankheiten wählen (0), Zeile 1" }),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Tetanus" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Diphtherie" }));
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    expect(screen.queryByText(error)).toBeNull();
    expect(within(tableRow(1)).getByText("Tetanus, Diphtherie")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Krankheiten wählen (2), Zeile 1" }),
    ).toBeTruthy();
    expect(state.draft.rows[0].diseases).toEqual(["tetanus", "diphtheria"]);
  });

  it("zeigt Hinweise des Chatbots, unsichere Felder und Dubletten", () => {
    setup([
      row("05.12.2016", "Boostrix Polio", {
        unsure: ["date", "batch"],
        hints: ["Krankheit „Pest“ nicht erkannt."],
      }),
      row("05.12.2016", "Repevax"),
    ]);
    const r = within(tableRow(1));
    expect(r.getByText("Unsicher gelesen: Datum, Charge.")).toBeTruthy();
    expect(r.getByText("Krankheit „Pest“ nicht erkannt.")).toBeTruthy();
    expect(r.getByText("Vielleicht doppelt, siehe Zeile 2.")).toBeTruthy();
    expect(
      within(tableRow(2)).getByText("Vielleicht doppelt, siehe Zeile 1."),
    ).toBeTruthy();
  });

  it("„Hinweise geprüft“ blendet die Hinweise der Zeile aus", async () => {
    const { state } = setup([row("05.12.2016", "Bostrix Polio")]);
    const hint = "Gelesen „Bostrix Polio“, erkannt als Boostrix Polio.";
    const reviewed = screen.getByRole("checkbox", {
      name: "Hinweise geprüft, Zeile 1",
    });
    await userEvent.click(reviewed);
    expect(screen.queryByText(hint)).toBeNull();
    expect(state.draft.rows[0].reviewed).toBe(true);
    expect(
      screen.getByText("1 Impfung, 0 mit Fehlern, 0 mit Hinweisen."),
    ).toBeTruthy();

    await userEvent.click(reviewed);
    expect(screen.getByText(hint)).toBeTruthy();
  });

  it("zeigt nach einer Änderung des Datums die Hinweise wieder", async () => {
    const { state } = setup([reviewedRow("05.12.2016", "Bostrix Polio")]);
    const hint = "Gelesen „Bostrix Polio“, erkannt als Boostrix Polio.";
    expect(screen.queryByText(hint)).toBeNull();

    await userEvent.type(input("Datum, Zeile 1"), "{Backspace}7");

    expect(screen.getByText(hint)).toBeTruthy();
    expect(state.draft.rows[0]).toMatchObject({
      date: "05.12.2017",
      reviewed: false,
    });
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Hinweise geprüft, Zeile 1",
        }) as HTMLButtonElement
      ).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("behält „Hinweise geprüft“, wenn Arzt, Charge oder Notiz sich ändern", async () => {
    const { state } = setup([reviewedRow("05.12.2016", "Bostrix Polio")]);
    await userEvent.type(input("Arzt oder Praxis, Zeile 1"), "Dr. M");
    await userEvent.type(input("Charge, Zeile 1"), "AB1");
    await userEvent.type(input("Notiz, Zeile 1"), "links");
    expect(state.draft.rows[0]).toMatchObject({
      doctor: "Dr. M",
      batch: "AB1",
      note: "links",
      reviewed: true,
    });
    expect(
      screen.queryByText(
        "Gelesen „Bostrix Polio“, erkannt als Boostrix Polio.",
      ),
    ).toBeNull();
  });

  it("geprüfte Zeile mit neuem, mehrdeutigem Namen zeigt Kandidaten und Fehler", async () => {
    const { state } = setup([reviewedRow("05.12.2016", "Boostrix Polio")]);
    const label = input("Impfstoff, Zeile 1");
    await userEvent.clear(label);
    await userEvent.type(label, "Gardasi 9");

    const r = within(tableRow(1));
    expect(r.getByText("Mehrere Impfstoffe passen:")).toBeTruthy();
    expect(r.getByRole("button", { name: "Gardasil 9, Zeile 1" })).toBeTruthy();
    expect(
      r.getByText("Impfstoff nicht erkannt. Wähle die Krankheiten."),
    ).toBeTruthy();
    expect(state.draft.rows[0]).toMatchObject({
      diseases: [],
      reviewed: false,
    });
  });

  it("bietet „Hinweise geprüft“ nur bei Hinweisen an", () => {
    setup([row()]);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("zählt Impfungen, Zeilen mit Fehlern und Zeilen mit Hinweisen", () => {
    setup([
      row("05.12.2016"),
      row("", "Bostrix Polio"),
      row("03.04.2018", "Bostrix Polio"),
    ]);
    expect(
      screen.getByText("3 Impfungen, 1 mit Fehlern, 1 mit Hinweisen."),
    ).toBeTruthy();
  });

  it("meldet ein unlesbares Geburtsdatum und prüft ohne es", () => {
    setup([row("05.12.1950")], "31.02.1967");
    expect(
      screen.getByText(
        "Das Geburtsdatum ist nicht lesbar. Schreib es als TT.MM.JJJJ.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText("Das Datum liegt vor dem Geburtsdatum."),
    ).toBeNull();
  });

  it("meldet ein Geburtsdatum in der Zukunft und prüft ohne es", () => {
    setup([row("05.12.2016")], "01.01.2099");
    expect(
      screen.getByText("Das Geburtsdatum liegt in der Zukunft."),
    ).toBeTruthy();
    expect(
      screen.queryByText("Das Datum liegt vor dem Geburtsdatum."),
    ).toBeNull();
  });

  it("prüft mit gültigem Geburtsdatum ohne Meldung dazu", () => {
    setup([row("05.12.1960")], "15.03.1967");
    expect(
      within(tableRow(1)).getByText("Das Datum liegt vor dem Geburtsdatum."),
    ).toBeTruthy();
    expect(screen.queryByText(/Das Geburtsdatum/)).toBeNull();
  });
});

describe("Zeilen hinzufügen und löschen", () => {
  it("„Zeile hinzufügen“ hängt eine leere Zeile an", async () => {
    const { state } = setup([row()]);
    await userEvent.click(
      screen.getByRole("button", { name: "Zeile hinzufügen" }),
    );
    expect(bodyRows()).toHaveLength(2);
    const date = input("Datum, Zeile 2");
    expect(date.value).toBe("");
    expect(document.activeElement).toBe(date);
    expect(within(tableRow(2)).getByText("Datum fehlt.")).toBeTruthy();
    expect(state.draft.rows[1]).toMatchObject({ date: "", label: "" });
    expect(state.draft.rows[1].id).not.toBe(state.draft.rows[0].id);
  });

  it("löscht sofort und holt die Zeile mit „Rückgängig“ an derselben Stelle zurück", async () => {
    const rows = [row("01.02.2010"), row("05.12.2016"), row("03.04.2018")];
    const { state } = setup(rows);
    await userEvent.click(
      screen.getByRole("button", { name: "Löschen, Zeile 2" }),
    );
    expect(bodyRows()).toHaveLength(2);
    expect(input("Datum, Zeile 2").value).toBe("03.04.2018");
    expect(screen.getByRole("status").textContent).toContain(
      "Zeile 2 gelöscht.",
    );

    await userEvent.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(bodyRows()).toHaveLength(3);
    expect(input("Datum, Zeile 2").value).toBe("05.12.2016");
    expect(state.draft.rows[1]).toBe(rows[1]);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("kann nur die letzte Löschung rückgängig machen", async () => {
    setup([row("01.02.2010"), row("05.12.2016"), row("03.04.2018")]);
    await userEvent.click(
      screen.getByRole("button", { name: "Löschen, Zeile 1" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Löschen, Zeile 2" }),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Zeile 2 gelöscht.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(bodyRows()).toHaveLength(2);
    expect(input("Datum, Zeile 1").value).toBe("05.12.2016");
    expect(input("Datum, Zeile 2").value).toBe("03.04.2018");
    expect(screen.queryByRole("button", { name: "Rückgängig" })).toBeNull();
  });

  it("zeigt nach dem Löschen der letzten Zeile eine leere Tabelle", async () => {
    setup([row()]);
    await userEvent.click(
      screen.getByRole("button", { name: "Löschen, Zeile 1" }),
    );
    expect(
      screen.getByText("Die Tabelle ist leer. Füge eine Zeile hinzu."),
    ).toBeTruthy();
    expect(nextButton().disabled).toBe(true);
  });
});

describe("Weiter zum Übertragen", () => {
  it("ist mit Fehlern gesperrt und sagt warum", async () => {
    const { onNext } = setup([row(""), row("03.04.2018")]);
    expect(nextButton().disabled).toBe(true);
    expect(
      screen.getByText("Behebe zuerst die rot markierten Zeilen."),
    ).toBeTruthy();
    await userEvent.click(nextButton());
    expect(onNext).not.toHaveBeenCalled();
  });

  it("ist ohne Zeilen gesperrt", () => {
    setup([]);
    expect(nextButton().disabled).toBe(true);
  });

  it("fragt bei offenen Hinweisen nach", async () => {
    const { onNext } = setup([
      row("05.12.2016", "Bostrix Polio"),
      row("03.04.2018"),
    ]);
    expect(nextButton().disabled).toBe(false);
    expect(
      screen.queryByText("Behebe zuerst die rot markierten Zeilen."),
    ).toBeNull();

    await userEvent.click(nextButton());
    expect(
      screen.getByRole("alertdialog", {
        name: "1 Zeile hat noch Hinweise. Trotzdem übertragen?",
      }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Zurück zur Tabelle" }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onNext).not.toHaveBeenCalled();

    await userEvent.click(nextButton());
    await userEvent.click(screen.getByRole("button", { name: "Übertragen" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("nennt die Zahl der Zeilen mit Hinweisen", async () => {
    setup([
      row("05.12.2016", "Bostrix Polio"),
      row("03.04.2018", "Bostrix Polio"),
    ]);
    await userEvent.click(nextButton());
    expect(
      screen.getByRole("alertdialog", {
        name: "2 Zeilen haben noch Hinweise. Trotzdem übertragen?",
      }),
    ).toBeTruthy();
  });

  it("geht ohne Hinweise direkt weiter", async () => {
    const { onNext } = setup([row()]);
    await userEvent.click(nextButton());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
