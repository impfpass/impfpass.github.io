import { parsePassDate } from "./passDate";

const today = "2026-11-27";
const p = (raw: string) => parsePassDate(raw, today);

describe("parsePassDate", () => {
  it.each(["05.12.2016", " 5.12.2016 ", "05. 12. 2016", "2016-12-05"])(
    "liest %j als Tag",
    (raw) => {
      expect(p(raw)).toEqual({ date: "2016-12-05", precision: "day" });
    },
  );

  it.each(["12.2016", "12/2016", "2016-12"])("liest %j als Monat", (raw) => {
    expect(p(raw)).toEqual({ date: "2016-12-01", precision: "month" });
  });

  it("liest ein Jahr", () => {
    expect(p("2016")).toEqual({ date: "2016-01-01", precision: "year" });
  });

  it("unleserliche Stellen senken die Genauigkeit", () => {
    const month = { date: "2016-12-01", precision: "month" };
    expect(p("??.12.2016")).toEqual(month);
    expect(p("x.12.2016")).toEqual(month);
    expect(p("??.??.2016")).toEqual({ date: "2016-01-01", precision: "year" });
  });

  it("deutet zweistellige Jahre relativ zum laufenden Jahr", () => {
    expect(p("12.03.75")).toEqual({ date: "1975-03-12", precision: "day" });
    expect(p("05.12.16")).toEqual({ date: "2016-12-05", precision: "day" });
    expect(p("01.01.26")).toEqual({ date: "2026-01-01", precision: "day" });
    expect(p("01.01.27")).toEqual({ date: "1927-01-01", precision: "day" });
  });

  it.each(["31.02.2016", "13.2016", "Dezember 2016"])("lehnt %j ab", (raw) => {
    expect(p(raw)).toBe("invalid");
  });

  it("meldet leere Eingaben", () => {
    expect(p("")).toBe("empty");
    expect(p("  ")).toBe("empty");
  });
});
