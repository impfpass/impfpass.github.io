import { z } from "zod";
import { DISEASE_IDS } from "../catalog/diseases";
import { isValidISODate } from "../dates";
import type {
  Decision,
  Draft,
  Person,
  PersonAnswers,
  RuleState,
  Settings,
  Vaccination,
} from "../model";
import { BLOOD_GROUPS, normalizeListSort, RHESUS_VALUES } from "../model";

/** zod-Schemata für die Datensicherung, in Plan 3 auch für den Import. */

// Ohne eval arbeiten: zod 4 probiert sonst beim Anlegen von Objekt-Schemata
// `new Function("")`, und die strikte CSP meldet das als Verstoß. Muss vor
// dem ersten z.object stehen.
z.config({ jitless: true });

export const isoDateSchema = z.string().refine(isValidISODate);

/** Zeitpunkt wie von `Date.toISOString()`, etwa `2026-11-26T14:00:00.000Z`. */
export const timestampSchema = z.iso.datetime({ offset: true });

export const diseaseIdSchema = z.enum(DISEASE_IDS);

export const personAnswersSchema: z.ZodType<PersonAnswers> = z.object({
  chronicIllness: z.boolean(),
  fsme: z.enum(["yes", "no", "open"]),
  job: z.object({
    patients: z.boolean(),
    communityFacility: z.boolean(),
    bloodContact: z.boolean(),
    animalContact: z.boolean(),
  }),
});

export const personSchema: z.ZodType<Person> = z.object({
  id: z.string().min(1),
  name: z.string(),
  birthDate: isoDateSchema,
  answers: personAnswersSchema,
  createdAt: timestampSchema,
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  rhesus: z.enum(RHESUS_VALUES).optional(),
  rhesusFormula: z.string().optional(),
});

export const vaccinationSchema: z.ZodType<Vaccination> = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  date: isoDateSchema,
  datePrecision: z.enum(["day", "month", "year"]),
  productId: z.string().nullable(),
  label: z.string(),
  diseases: z.array(diseaseIdSchema),
  batch: z.string().optional(),
  doctor: z.string().optional(),
  note: z.string().optional(),
  source: z.enum(["manual", "import"]),
  importId: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const decisionSchema: z.ZodType<Decision> = z.object({
  personId: z.string().min(1),
  recommendationId: z.string().min(1),
  kind: z.enum([
    "declined",
    "not_needed",
    "doctor_recommends",
    "doctor_not_applicable",
  ]),
  reason: z.string().optional(),
  at: timestampSchema,
});

export const settingsSchema: z.ZodType<Settings> = z.object({
  leadMonths: z.number().int().min(0),
  seasonDay: z.string().regex(/^\d{2}-\d{2}$/),
  listSort: z.string().transform(normalizeListSort),
  gtdUrl: z.string().optional(),
  lastBackupAt: timestampSchema.optional(),
  installHintDismissed: z.boolean().optional(),
});

export const ruleStateSchema: z.ZodType<RuleState> = z.object({
  personId: z.string().min(1),
  seenVersion: z.string().min(1),
  snapshot: z.array(
    z.object({
      id: z.string().min(1),
      dueDate: isoDateSchema.nullable(),
      dose: z.number().int().nullable(),
      season: z.boolean(),
    }),
  ),
  notices: z.array(
    z.object({
      kind: z.enum(["new", "changed", "dropped"]),
      recommendationId: z.string().min(1),
      text: z.string().nullable(),
      validSince: isoDateSchema.nullable(),
    }),
  ),
});

const rowFieldSchema = z.enum(["date", "label", "batch", "doctor", "diseases"]);

/** Entwurf der PC-App (Plan 3), liegt in der Datenbank `impfpass-import`. */
export const draftSchema: z.ZodType<Draft> = z.object({
  version: z.literal(1),
  birthDate: z.string(),
  rows: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string(),
      label: z.string(),
      productId: z.string().min(1).nullable(),
      diseases: z.array(diseaseIdSchema),
      batch: z.string(),
      doctor: z.string(),
      note: z.string(),
      unsure: z.array(rowFieldSchema),
      hints: z.array(z.string()),
      reviewed: z.boolean(),
    }),
  ),
  updatedAt: timestampSchema,
});
