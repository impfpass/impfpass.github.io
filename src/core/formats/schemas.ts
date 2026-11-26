import { z } from "zod";
import { DISEASE_IDS } from "../catalog/diseases";
import { isValidISODate } from "../dates";
import type {
  Decision,
  Person,
  PersonAnswers,
  Settings,
  Vaccination,
} from "../model";

/** zod-Schemata für die Datensicherung, in Plan 3 auch für den Import. */

// Ohne eval arbeiten: zod 4 probiert sonst beim Anlegen von Objekt-Schemata
// `new Function("")`, und die strikte CSP meldet das als Verstoß. Muss vor
// dem ersten z.object stehen.
z.config({ jitless: true });

export const isoDateSchema = z.string().refine(isValidISODate);

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
  createdAt: z.string(),
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
  createdAt: z.string(),
  updatedAt: z.string(),
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
  at: z.string(),
});

export const settingsSchema: z.ZodType<Settings> = z.object({
  leadMonths: z.number().int().min(0),
  seasonDay: z.string().regex(/^\d{2}-\d{2}$/),
  listSort: z.enum(["date-desc", "date-asc", "product", "disease"]),
  gtdUrl: z.string().optional(),
  lastBackupAt: z.string().optional(),
  installHintDismissed: z.boolean().optional(),
});
