import { z } from "zod";
import { personSchema } from "./schemas";

it("zod prüft ohne eval, sonst meldet die strikte CSP einen Verstoß", () => {
  // zod 4 probiert sonst beim Anlegen von Objekt-Schemata `new Function("")`.
  expect(personSchema).toBeDefined();
  expect(z.config().jitless).toBe(true);
});
