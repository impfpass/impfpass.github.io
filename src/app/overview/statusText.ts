import { formatDate } from "@/core/dates";
import type { Recommendation } from "@/core/rules/types";
import { T } from "@/texts";

/** Statuszeile einer Empfehlung; Übersicht mit Monat, Detail mit Tag. */
export function statusText(
  r: Recommendation,
  precision: "month" | "day" = "month",
): string {
  const S = T.rec.status;
  const date = (d: string | null) => (d ? formatDate(d, precision) : "");
  const label = r.reason.kind === "season" ? r.reason.label : "";
  const n = r.dose?.number ?? "";
  const due = date(r.dueDate);

  switch (r.status) {
    case "overdue":
    case "due":
      // Überfällig heißt bei Folgedosen: „spätestens“ liegt schon zurück.
      if (r.timing === "follow_up")
        return (
          S.doseDue(n) +
          (r.latestDate && r.status === "due"
            ? S.latest(date(r.latestDate))
            : "")
        );
      if (r.timing === "season") return S.seasonOpen(label);
      return r.status === "overdue" ? S.overdueSince(due) : S.dueNow;
    case "soon":
      if (r.timing === "follow_up") return S.doseFrom(n, due);
      if (r.timing === "season") return S.seasonFrom(label, due);
      return S.dueFrom(due);
    case "protected":
      if (r.timing === "season") return S.seasonDone(label);
      if (r.dueDate) return S.protectedUntil(due);
      return r.reason.kind === "long_protection"
        ? S.protectedOpen
        : S.protectedNoBooster;
    case "future":
      // Vor der Saison-Regel: Unter der Altersgrenze zählt der Geburtstag.
      if (r.reason.kind === "age") return S.fromAge(r.reason.age, due);
      if (r.timing === "season") return S.nextSeason(due);
      if (r.timing === "follow_up") return S.doseFrom(n, due);
      return S.from(due);
    default:
      return "";
  }
}
