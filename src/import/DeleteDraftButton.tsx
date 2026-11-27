import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { T } from "@/texts";

const t = T.pc.send;

/** „Entwurf löschen“ mit Rückfrage, gleich in allen drei Schritten. */
export function DeleteDraftButton({ onConfirm }: { onConfirm(): void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirming(true)}
      >
        {t.deleteDraft}
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onConfirm()}>
              {t.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
