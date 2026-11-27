import { ageOn } from "../dates";
import type { Decision, ISODate, Person, Vaccination } from "../model";
import type { Recommendation, Rulebook } from "./types";

/** Unter 18 Jahren am Tag `today` gibt es keine Empfehlungen. */
export function evaluate(
  person: Person,
  vaccinations: Vaccination[],
  decisions: Decision[],
  today: ISODate,
  rulebook: Rulebook,
  options: { leadMonths: number; seasonDay: string },
): Recommendation[] {
  if (ageOn(person.birthDate, today) < 18) return [];
  const own = vaccinations.filter(
    (v) => v.personId === person.id && v.date <= today,
  );
  return rulebook.rules.map((rule) => {
    const decision = decisions.find(
      (d) => d.personId === person.id && d.recommendationId === rule.id,
    );
    const result = rule.evaluate({
      person,
      vaccinations: own,
      decision,
      today,
      leadMonths: options.leadMonths,
      seasonDay: options.seasonDay,
    });
    let status = result.status;
    if (status !== "not_applicable") {
      if (decision?.kind === "declined") status = "declined";
      else if (decision?.kind === "not_needed") status = "not_needed";
    }
    return {
      ...result,
      id: rule.id,
      diseases: rule.diseases,
      source: result.source ?? rule.source,
      status,
    };
  });
}
