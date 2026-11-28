import { describe, expect, it } from "vitest";
import { z } from "zod";
import { gtdStateSchema, personSchema, ruleStateSchema } from "./schemas";

it("zod prüft ohne eval, sonst meldet die strikte CSP einen Verstoß", () => {
  // zod 4 probiert sonst beim Anlegen von Objekt-Schemata `new Function("")`.
  expect(personSchema).toBeDefined();
  expect(z.config().jitless).toBe(true);
});

describe("ruleStateSchema", () => {
  const valid = {
    personId: "p1",
    seenVersion: "2026-12-01.1",
    snapshot: [{ id: "a", dueDate: "2027-01-01", dose: null, season: false }],
    notices: [
      {
        kind: "new",
        recommendationId: "a",
        text: null,
        validSince: "2027-01-15",
      },
    ],
  };
  it("akzeptiert einen gültigen Stand", () => {
    expect(ruleStateSchema.parse(valid)).toEqual(valid);
  });
  it("lehnt eine falsche Form ab", () => {
    expect(ruleStateSchema.safeParse({ personId: "p1" }).success).toBe(false);
    expect(
      ruleStateSchema.safeParse({
        ...valid,
        notices: [{ ...valid.notices[0], kind: "gone" }],
      }).success,
    ).toBe(false);
  });
});

describe("gtdStateSchema", () => {
  const valid = {
    personId: "p1",
    handedOver: [
      {
        ref: "ip-0123456789abcdef",
        contentHash: "fedcba9876543210",
        at: "2026-11-28T12:00:00.000Z",
      },
    ],
  };
  it("akzeptiert einen gültigen Stand", () => {
    expect(gtdStateSchema.parse(valid)).toEqual(valid);
  });
  it("lehnt eine ref ohne ip- und eine falsche Form ab", () => {
    const badRef = {
      ...valid,
      handedOver: [{ ...valid.handedOver[0], ref: "0123456789abcdef" }],
    };
    expect(gtdStateSchema.safeParse(badRef).success).toBe(false);
    expect(
      gtdStateSchema.safeParse({ personId: "p1", handedOver: "kaputt" })
        .success,
    ).toBe(false);
  });
});
