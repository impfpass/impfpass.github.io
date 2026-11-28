import { T } from "@/texts";
import { addDays, addMonths, formatDate } from "../dates";
import { sha256Hex } from "../formats/sha256";
import type { ISODate } from "../model";
import { seasonLabel } from "../rules/season";
import type {
  Recommendation,
  RecStatus,
  Rulebook,
  SourceRef,
} from "../rules/types";

/**
 * Eine Erinnerung „Termin beim Arzt ausmachen“ für die GTD-App (Spec 9.1).
 * `day` ist der berechnete Erinnerungstag, bevor er auf heute vorgezogen
 * wird; `null` heißt sofort. Vorgezogen wird erst beim Erzeugen der Übergabe,
 * damit eine Erinnerung nicht als geändert gilt, nur weil ihr Tag vorbei ist.
 */
export interface GtdReminder {
  ref: string;
  day: ISODate | null;
  title: string;
  description: string;
  checklist: string[];
}

/** Status, die eine Erinnerung ergeben, sofern es einen nächsten Termin gibt. */
const ACTIVE: RecStatus[] = ["protected", "soon", "due", "overdue", "future"];
const SEASONS = 3;
/** Folgedosen und späte Saisontermine: 4 Wochen vorher (Spec 9.1). */
const EARLY_DAYS = 28;

const date = (d: ISODate) => formatDate(d, "day");
const nameOf = (id: string) => T.rec.names[id] ?? id;

/**
 * Die Bildung der ref darf sich nie ändern, sonst entstehen im GTD doppelte
 * Aktionen (`CLAUDE.md`). Die zufällige Personen-Kennung macht sie
 * undurchsichtig.
 */
function refOf(personId: string, key: (string | number | null)[]): string {
  return `ip-${sha256Hex(JSON.stringify([personId, ...key])).slice(0, 16)}`;
}

/** Saison, in die ein Datum fällt; zwischen April und Saison-Tag die kommende. */
function firstSeason(due: ISODate, seasonDay: string): number {
  const year = Number(due.slice(0, 4));
  if (due >= `${year}-${seasonDay}` || due > `${year}-03-31`) return year;
  return year - 1;
}

function ageOf(r: Recommendation): number | null {
  if (r.reason.kind === "age") return r.reason.age;
  if (r.reason.kind === "discuss") return r.reason.normalAge;
  return null;
}

function single(
  personId: string,
  r: Recommendation,
  source: SourceRef,
  leadMonths: number,
): GtdReminder | null {
  const I = T.gtd.items;
  const dose = r.dose?.number ?? null;
  const detail =
    dose !== null ? I.dose(dose) : r.reason.kind === "booster" ? I.booster : "";
  let day: ISODate | null;
  let start: string;
  if (r.timing === "follow_up" && r.dueDate) {
    day = addDays(r.dueDate, -EARLY_DAYS);
    start =
      I.earliest(date(r.dueDate)) +
      (r.latestDate ? I.latest(date(r.latestDate)) : "");
  } else if (r.dueDate) {
    day = addMonths(r.dueDate, -leadMonths);
    const age = ageOf(r);
    start =
      age !== null
        ? I.dueFromAge(date(r.dueDate), age)
        : I.dueFrom(date(r.dueDate));
  } else if (r.status === "due" || r.status === "overdue") {
    day = null;
    start = I.dueNow;
  } else {
    return null;
  }
  return {
    ref: refOf(personId, [r.id, dose, r.dueDate]),
    day,
    title: I.title(nameOf(r.id), detail),
    description: start + I.source(source.edition),
    checklist: [...I.checklist],
  };
}

function seasons(
  personId: string,
  r: Recommendation,
  source: SourceRef,
  seasonDay: string,
): GtdReminder[] {
  const I = T.gtd.items;
  const due = r.dueDate;
  if (!due) return [];
  const first = firstSeason(due, seasonDay);
  return Array.from({ length: SEASONS }, (_, k) => {
    const year = first + k;
    const label = seasonLabel(year);
    const start: ISODate = `${year}-${seasonDay}`;
    const late = k === 0 && due > start;
    const early = addDays(due, -EARLY_DAYS);
    return {
      ref: refOf(personId, [r.id, null, label]),
      day: late && early > start ? early : start,
      title: I.title(nameOf(r.id), I.season(label)),
      description:
        I.seasonYearly(label) +
        (late ? I.seasonEarliest(date(due)) : "") +
        I.source(source.edition),
      checklist: [...I.checklist],
    };
  });
}

/** Sammelaktion; die ref hängt an der Menge der Fragen (Plan 4, Entscheidung 6). */
function questions(personId: string, open: Recommendation[]): GtdReminder {
  const Q = T.gtd.questions;
  const ids = open.map((r) => r.id as string).sort();
  const asked = [...open]
    .sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id), "de"))
    .map((r) => {
      const name = nameOf(r.id);
      if (r.reason.kind === "discuss" && r.reason.topic === "serology")
        return Q.serology(name);
      return ageOf(r) !== null ? Q.earlier(name) : Q.illness(name);
    });
  return {
    ref: refOf(personId, ["doctor-questions", ids.join(",")]),
    day: null,
    title: Q.title,
    description: Q.description,
    checklist: [...asked, Q.answer],
  };
}

/** Alle bekannten Erinnerungen einer Person, sofort zuerst, dann nach Tag. */
export function remindersFor(input: {
  personId: string;
  recommendations: Recommendation[];
  leadMonths: number;
  seasonDay: string;
  rulebook: Rulebook;
}): GtdReminder[] {
  const { personId, recommendations, leadMonths, seasonDay, rulebook } = input;
  const result: GtdReminder[] = [];
  for (const r of recommendations) {
    const byAge =
      r.status === "discuss" && ageOf(r) !== null && r.dueDate !== null;
    if (!ACTIVE.includes(r.status) && !byAge) continue;
    // Bei offener Karte trägt die Empfehlung die Fundstelle der Karte; die
    // Erinnerung nach Alter nennt die der Regel nach Alter, damit das
    // Umschalten der Grunderkrankung sie nicht ändert.
    const source = byAge
      ? (rulebook.rules.find((rule) => rule.id === r.id)?.source ?? r.source)
      : r.source;
    if (r.timing === "season")
      result.push(...seasons(personId, r, source, seasonDay));
    else {
      const one = single(personId, r, source, leadMonths);
      if (one) result.push(one);
    }
  }
  const open = recommendations.filter((r) => r.status === "discuss");
  if (open.length > 0) result.push(questions(personId, open));
  return result.sort((a, b) => {
    if (a.day !== b.day) {
      if (a.day === null) return -1;
      if (b.day === null) return 1;
      return a.day < b.day ? -1 : 1;
    }
    return a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0;
  });
}
