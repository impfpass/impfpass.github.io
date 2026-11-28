import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_ANSWERS, type PersonAnswers } from "@/core/model";
import { T } from "@/texts";
import { AnswersFields } from "./AnswersFields";

function Harness({ onChange }: { onChange(a: PersonAnswers): void }) {
  const [value, setValue] = useState(DEFAULT_ANSWERS);
  return (
    <AnswersFields
      idPrefix="t"
      value={value}
      onChange={(a) => {
        setValue(a);
        onChange(a);
      }}
    />
  );
}

it("FSME hat drei Antworten und den Link zur RKI-Karte", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  expect(screen.getByRole("radio", { name: "Ja" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Nein" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Weiß ich nicht" })).toBeTruthy();
  const link = screen.getByRole("link", {
    name: "Karte der FSME-Risikogebiete (RKI)",
  });
  expect(link.getAttribute("href")).toBe(
    "https://www.rki.de/DE/Themen/Infektionskrankheiten/Infektionskrankheiten-A-Z/F/FSME/Karte.html",
  );
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  await user.click(screen.getByRole("radio", { name: "Ja" }));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({ fsme: "yes" }),
  );
});

it("die FSME-Auswahl trägt die Frage als Namen und den Hinweis als Beschreibung", () => {
  render(<Harness onChange={vi.fn()} />);
  const group = screen.getByRole("radiogroup", {
    name: T.answers.fsmeQuestion,
  });
  const help = document.getElementById(
    group.getAttribute("aria-describedby") ?? "",
  );
  expect(help?.textContent).toBe(T.answers.fsmeHelp);
});

it("der Schalter für die chronische Erkrankung ändert die Angabe", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  await user.click(
    screen.getByRole("switch", { name: "Ich habe eine chronische Erkrankung" }),
  );
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({ chronicIllness: true }),
  );
});

it("der Hinweis zum Betriebsarzt erscheint, sobald eine Tätigkeit angekreuzt ist", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const hint = /Betriebsärztin oder der Betriebsarzt/;
  expect(screen.queryByText(hint)).toBeNull();
  await user.click(
    screen.getByRole("checkbox", {
      name: "Ich arbeite mit Patienten oder Pflegebedürftigen.",
    }),
  );
  expect(screen.getByText(hint)).toBeTruthy();
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      job: expect.objectContaining({ patients: true }),
    }),
  );
});
