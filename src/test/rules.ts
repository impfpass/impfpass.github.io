import { getProduct } from "@/core/catalog/products";
import { normalizeToPrecision } from "@/core/dates";
import {
  DEFAULT_ANSWERS,
  type DatePrecision,
  type Decision,
  type DiseaseId,
  type ISODate,
  type Person,
  type PersonAnswers,
  type Vaccination,
} from "@/core/model";
import type { Rule, RuleResult } from "@/core/rules/types";

const PERSON_ID = "p1";
let counter = 0;

export function person(
  birthDate: ISODate,
  answers: {
    chronicIllness?: boolean;
    fsme?: PersonAnswers["fsme"];
    job?: Partial<PersonAnswers["job"]>;
  } = {},
): Person {
  return {
    id: PERSON_ID,
    name: "Testperson",
    birthDate,
    answers: {
      chronicIllness: answers.chronicIllness ?? DEFAULT_ANSWERS.chronicIllness,
      fsme: answers.fsme ?? DEFAULT_ANSWERS.fsme,
      job: { ...DEFAULT_ANSWERS.job, ...answers.job },
    },
    createdAt: "2026-11-26T10:00:00.000Z",
  };
}

function vaccination(
  date: ISODate,
  precision: DatePrecision,
  productId: string | null,
  label: string,
  diseases: DiseaseId[],
): Vaccination {
  counter += 1;
  return {
    id: `v${counter}`,
    personId: PERSON_ID,
    date: normalizeToPrecision(date, precision),
    datePrecision: precision,
    productId,
    label,
    diseases,
    source: "manual",
    createdAt: "2026-11-26T10:00:00.000Z",
    updatedAt: "2026-11-26T10:00:00.000Z",
  };
}

/** Impfung mit Impfstoff aus dem Katalog; die Krankheiten kommen von dort. */
export function shot(
  date: ISODate,
  productId: string,
  precision: DatePrecision = "day",
): Vaccination {
  const product = getProduct(productId);
  if (!product) throw new Error(`Unbekannter Impfstoff: ${productId}`);
  return vaccination(date, precision, productId, product.name, [
    ...product.diseases,
  ]);
}

/** Impfung ohne Impfstoff, nur mit Krankheiten. */
export function freeShot(date: ISODate, diseases: DiseaseId[]): Vaccination {
  return vaccination(date, "day", null, "Freie Eingabe", diseases);
}

export function run(
  rule: Rule,
  input: {
    person: Person;
    vaccinations?: Vaccination[];
    decision?: Decision["kind"];
    today: ISODate;
    leadMonths?: number;
    seasonDay?: string;
  },
): RuleResult {
  const decision: Decision | undefined = input.decision
    ? {
        personId: input.person.id,
        recommendationId: rule.id,
        kind: input.decision,
        at: "2026-11-26T10:00:00.000Z",
      }
    : undefined;
  return rule.evaluate({
    person: input.person,
    vaccinations: input.vaccinations ?? [],
    decision,
    today: input.today,
    leadMonths: input.leadMonths ?? 6,
    seasonDay: input.seasonDay ?? "09-01",
  });
}
