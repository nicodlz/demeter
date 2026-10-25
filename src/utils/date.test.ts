import { describe, expect, it } from "vitest";
import {
  addDaysLocal,
  formatLocalDate,
  isValidCalendarDate,
  parseCalendarDate,
  toCalendarDate,
  todayLocalISO,
} from "./date";
import {
  parseDateDDMMYYYY,
  parseFrenchDate,
  parseISODate,
} from "./parsers/parserUtils";

describe("calendar date utilities", () => {
  it("keeps the calendar day for date-only strings", () => {
    const date = parseCalendarDate("2025-09-02");
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(2);
  });

  it("formats a local date as YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2025, 8, 2))).toBe("2025-09-02");
  });

  it("parses DD/MM/YYYY without a timezone shift", () => {
    expect(parseDateDDMMYYYY("02/09/2025")).toBe("2025-09-02");
    expect(parseDateDDMMYYYY("31/12/2025")).toBe("2025-12-31");
  });

  it("rejects non-existent calendar dates", () => {
    expect(parseDateDDMMYYYY("31/02/2025")).toBeNull();
    expect(isValidCalendarDate("2025-02-31")).toBe(false);
  });

  it("parses French month names without a timezone shift", () => {
    expect(parseFrenchDate("1", "octobre", "2025")).toBe("2025-10-01");
    expect(parseFrenchDate("1", "inconnu", "2025")).toBeNull();
  });

  it("keeps the leading day of an ISO datetime without an offset", () => {
    expect(parseISODate("2025-12-17T17:40:22.883")).toBe("2025-12-17");
  });

  it("projects timestamps with an explicit offset into the local calendar", () => {
    const instant = "2025-12-17T12:00:00Z";
    expect(toCalendarDate(instant)).toBe(formatLocalDate(new Date(instant)));
  });

  it("produces a valid today value and day arithmetic", () => {
    expect(isValidCalendarDate(todayLocalISO())).toBe(true);
    expect(isValidCalendarDate(addDaysLocal(30))).toBe(true);
  });
});
