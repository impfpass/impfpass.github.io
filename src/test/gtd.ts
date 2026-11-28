import { inflateSync } from "fflate";
import type { GtdPayload } from "@/core/formats/gtd";
import type { Recommendation } from "@/core/rules/types";
import { eb4 } from "@/core/rules/recommendations/eb4";

/** Liest `<daten>` aus Link oder Text zurück, wie die GTD-App es tun wird. */
export function decodeGtdData(data: string): GtdPayload {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(inflateSync(bytes))) as GtdPayload;
}

/** Empfehlung für Tests der GTD-Übergabe; nicht genannte Felder bekommen Voreinstellungen. */
export function rec(
  overrides: Partial<Recommendation> & Pick<Recommendation, "id">,
): Recommendation {
  return {
    diseases: [],
    status: "future",
    dueDate: null,
    latestDate: null,
    dose: null,
    timing: "normal",
    reason: { kind: "none" },
    source: eb4(1, "Test"),
    ...overrides,
  };
}
