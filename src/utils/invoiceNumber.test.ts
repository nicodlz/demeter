import { describe, expect, it } from "vitest";
import {
  extractInvoiceCounter,
  generateInvoiceNumber,
  generateNextInvoiceNumber,
} from "./invoiceNumber";

const year = new Date().getFullYear().toString();

describe("invoice numbering", () => {
  it("formats supported patterns", () => {
    expect(generateInvoiceNumber(1, "YYYY-NNN")).toBe(`${year}-001`);
    expect(generateInvoiceNumber(42, "YYYYNNN")).toBe(`${year}042`);
    expect(generateInvoiceNumber(7, "FA-YYYY-NNN")).toBe(`FA-${year}-007`);
  });

  it("extracts the counter using the configured format", () => {
    expect(extractInvoiceCounter(`${year}-042`, "YYYY-NNN")).toBe(42);
    expect(extractInvoiceCounter(`${year}042`, "YYYYNNN")).toBe(42);
    expect(extractInvoiceCounter(`FA-${year}-007`, "FA-YYYY-NNN")).toBe(7);
    expect(extractInvoiceCounter("not-an-invoice", "YYYY-NNN")).toBeNull();
  });

  it("never reuses an existing number, including after deleting the last one", () => {
    expect(
      generateNextInvoiceNumber([`${year}-001`, `${year}-003`], "YYYY-NNN"),
    ).toBe(`${year}-004`);
    expect(generateNextInvoiceNumber([`${year}001`], "YYYYNNN")).toBe(
      `${year}002`,
    );
  });

  it("does not let a YYYYNNN number poison the YYYY-NNN sequence", () => {
    expect(
      generateNextInvoiceNumber([`${year}-001`, `${year}999`], "YYYY-NNN"),
    ).toBe(`${year}-002`);
  });
});
