import { render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

function open(showCloseButton?: boolean) {
  render(
    <Dialog open>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={showCloseButton}
      >
        <DialogTitle>Titel</DialogTitle>
      </DialogContent>
    </Dialog>,
  );
}

it("gibt dem Schließen-Knopf eine Fläche von mindestens 44 mal 44 Pixeln", () => {
  open();
  const close = screen.getByRole("button", { name: "Schließen" });
  expect(close.className).toMatch(/\bsize-11\b/);
});

it("blendet den Schließen-Knopf mit showCloseButton={false} aus", () => {
  open(false);
  expect(screen.queryByRole("button", { name: "Schließen" })).toBeNull();
});
