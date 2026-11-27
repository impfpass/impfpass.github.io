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
      if (r.timing === "follow_up")
        return (
          S.doseDue(n) + (r.latestDate ? S.latest(date(r.latestDate)) : "")
        );
      if (r.timing === "season") return S.seasonOpen(label);
      return r.status === "overdue" ? S.overdueSince(due) : S.dueNow;
    case "soon":
      if (r.timing === "follow_up") return S.doseFrom(n, due);
      if (r.timing === "season") return S.seasonFrom(label, due);
      return S.dueFrom(due);
    case "protected":
      if (r.timing === "season") return S.seasonDone(label);
      return r.dueDate ? S.protectedUntil(due) : S.protectedNoBooster;
    case "future":
      if (r.timing === "season") return S.nextSeason(due);
      if (r.reason.kind === "age") return S.fromAge(r.reason.age, due);
      return S.from(due);
    default:
      return "";
  }
}
