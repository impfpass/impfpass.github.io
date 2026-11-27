import { isPossibleDuplicate, type Dated } from "./duplicates";

const d = (
  date: string,
  datePrecision: Dated["datePrecision"],
  diseases: Dated["diseases"] = ["tetanus"],
): Dated => ({ date, datePrecision, diseases });

describe("isPossibleDuplicate", () => {
  it("gleicher Tag mit gemeinsamer Krankheit", () => {
    expect(
      isPossibleDuplicate(
        d("2016-12-05", "day", ["tetanus", "polio"]),
        d("2016-12-05", "day", ["polio"]),
      ),
    ).toBe(true);
  });

  it("gleicher Tag ohne gemeinsame Krankheit", () => {
    expect(
      isPossibleDuplicate(
        d("2016-12-05", "day", ["tetanus"]),
        d("2016-12-05", "day", ["measles"]),
      ),
    ).toBe(false);
  });

  it("verschiedene Tage", () => {
    expect(
      isPossibleDuplicate(d("2016-12-05", "day"), d("2016-12-06", "day")),
    ).toBe(false);
  });

  it("vergleicht in der gröberen Genauigkeit", () => {
    expect(
      isPossibleDuplicate(d("2016-12-01", "month"), d("2016-12-05", "day")),
    ).toBe(true);
    expect(
      isPossibleDuplicate(d("2016-01-01", "year"), d("2016-07-01", "day")),
    ).toBe(true);
    expect(
      isPossibleDuplicate(d("2016-01-01", "year"), d("2017-01-01", "day")),
    ).toBe(false);
  });
});
