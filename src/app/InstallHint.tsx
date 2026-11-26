import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "./data/AppData";
import { isStandalone, shouldShowInstallHint } from "./installHintRules";
import { T } from "./texts";

/** Tipp für das iPhone, ImpfPass zum Home-Bildschirm hinzuzufügen. */
export function InstallHint() {
  const { settings, actions } = useAppData();
  if (
    !shouldShowInstallHint(
      navigator.userAgent,
      isStandalone(),
      settings.installHintDismissed === true,
    )
  ) {
    return null;
  }

  return (
    <aside className="flex items-start gap-2 rounded-lg border bg-muted p-4">
      <p className="flex-1">{T.installHint.text}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={T.installHint.dismiss}
        onClick={() =>
          void actions.saveSettings({ ...settings, installHintDismissed: true })
        }
      >
        <X aria-hidden="true" />
      </Button>
    </aside>
  );
}
