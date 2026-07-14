import { describe, expect, it } from "vitest";

import { toUtcMidnight, advanceRenewalDate } from "@/lib/date";

/**
 * Regola 2 (ARCHITECTURE.md): date sempre a 00:00:00 UTC.
 * Questi test bloccano l'assenza di bug di fuso orario (off-by-one day).
 */

describe("toUtcMidnight()", () => {
  it("ancora una stringa YYYY-MM-DD a mezzanotte UTC (no off-by-one)", () => {
    expect(toUtcMidnight("2026-07-08").toISOString()).toBe(
      "2026-07-08T00:00:00.000Z",
    );
  });

  it("azzera l'orario di una Date usando i componenti UTC", () => {
    expect(
      toUtcMidnight(new Date("2026-07-08T23:30:00.000Z")).toISOString(),
    ).toBe("2026-07-08T00:00:00.000Z");
  });
});

describe("advanceRenewalDate()", () => {
  it("MONTHLY → +1 mese a mezzanotte UTC", () => {
    expect(
      advanceRenewalDate(toUtcMidnight("2026-07-08"), "MONTHLY").toISOString(),
    ).toBe("2026-08-08T00:00:00.000Z");
  });

  it("YEARLY → +1 anno a mezzanotte UTC", () => {
    expect(
      advanceRenewalDate(toUtcMidnight("2026-07-08"), "YEARLY").toISOString(),
    ).toBe("2027-07-08T00:00:00.000Z");
  });

  it("MONTHLY a dicembre rolla al gennaio dell'anno successivo", () => {
    expect(
      advanceRenewalDate(toUtcMidnight("2026-12-15"), "MONTHLY").toISOString(),
    ).toBe("2027-01-15T00:00:00.000Z");
  });
});
