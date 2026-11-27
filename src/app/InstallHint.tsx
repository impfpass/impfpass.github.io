import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "./data/AppData";
import { isStandalone, shouldShowInstallHint } from "./installHintRules";
import { T } from "./texts";

/** Tipp für das iPhone, ImpfPass zum Home-Bildschirm hinzuzufügen. */
export function InstallHint() {
  const { settings, actions } = useAppData();
  const [saveFailed, setSaveFailed] = useState(false);
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
      <div className="flex flex-1 flex-col gap-2">
        <p>{T.installHint.text}</p>
        {saveFailed && (
          <p role="alert" className="text-destructive">
            {T.common.saveFailed}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={T.installHint.dismiss}
        onClick={() =>
          actions
            .saveSettings({ ...settings, installHintDismissed: true })
            .catch(() => setSaveFailed(true))
        }
      >
        <X aria-hidden="true" />
      </Button>
    </aside>
  );
}
