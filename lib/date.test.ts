import { describe, expect, it } from "vitest";

import {
  addDaysUTC,
  advanceRenewalDate,
  buildMonthBuckets,
  daysInUtcMonth,
  toUtcMidnight,
  utcDateClamped,
} from "@/lib/date";

/**
 * Regola 2 (AI_law_subsync.md): date sempre a 00:00:00 UTC.
 * Questi test bloccano l'assenza di bug di fuso orario (off-by-one day).
 */

const iso = (date: Date) => date.toISOString().slice(0, 10);

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

describe("daysInUtcMonth()", () => {
  it("conta i giorni dei mesi corti e lunghi", () => {
    expect(daysInUtcMonth(2026, 0)).toBe(31); // gennaio
    expect(daysInUtcMonth(2026, 1)).toBe(28); // febbraio, anno comune
    expect(daysInUtcMonth(2026, 3)).toBe(30); // aprile
  });

  it("riconosce il febbraio degli anni bisestili", () => {
    expect(daysInUtcMonth(2028, 1)).toBe(29);
  });
});

describe("utcDateClamped()", () => {
  it("satura il giorno all'ultimo disponibile invece di traboccare", () => {
    expect(iso(utcDateClamped(2026, 1, 31))).toBe("2026-02-28");
  });

  it("lascia intatto un giorno che esiste nel mese", () => {
    expect(iso(utcDateClamped(2026, 1, 15))).toBe("2026-02-15");
  });

  it("normalizza un indice di mese fuori range nell'anno successivo", () => {
    expect(iso(utcDateClamped(2026, 12, 15))).toBe("2027-01-15");
  });
});

describe("addDaysUTC()", () => {
  it("attraversa il confine di mese restando a mezzanotte UTC", () => {
    expect(addDaysUTC(toUtcMidnight("2026-01-31"), 1).toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
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

/**
 * Regressione del bug di clamping: prima di questo fix `Date.UTC(y, m + 1, d)`
 * faceva traboccare il 31 febbraio al 3 marzo, saltando febbraio del tutto e
 * spostando l'abbonamento al giorno 3 in modo permanente.
 */
describe("advanceRenewalDate() — saturazione di fine mese", () => {
  it("un mensile del 31 gennaio rinnova il 28 febbraio, non il 3 marzo", () => {
    expect(iso(advanceRenewalDate(toUtcMidnight("2026-01-31"), "MONTHLY"))).toBe(
      "2026-02-28",
    );
  });

  it("negli anni bisestili satura al 29 febbraio", () => {
    expect(iso(advanceRenewalDate(toUtcMidnight("2028-01-31"), "MONTHLY"))).toBe(
      "2028-02-29",
    );
  });

  it("un mensile del 30 gennaio rinnova il 28 febbraio", () => {
    expect(iso(advanceRenewalDate(toUtcMidnight("2026-01-30"), "MONTHLY"))).toBe(
      "2026-02-28",
    );
  });

  it("un annuale del 29 febbraio rinnova il 28 febbraio nell'anno comune", () => {
    expect(iso(advanceRenewalDate(toUtcMidnight("2028-02-29"), "YEARLY"))).toBe(
      "2029-02-28",
    );
  });

  it("non salta mai un mese: dodici avanzamenti danno dodici mesi distinti", () => {
    let cursor = toUtcMidnight("2026-01-31");
    const months: number[] = [];

    for (let i = 0; i < 12; i++) {
      cursor = advanceRenewalDate(cursor, "MONTHLY");
      months.push(cursor.getUTCMonth());
    }

    // Febbraio (indice 1) deve esserci: era proprio il mese che spariva.
    expect(months).toContain(1);
    expect(new Set(months).size).toBe(12);
  });
});

describe("buildMonthBuckets()", () => {
  // 21 agosto 2026.
  const NOW = new Date("2026-08-21T10:00:00.000Z");

  it("costruisce la finestra retrospettiva classica (forward = 0)", () => {
    const buckets = buildMonthBuckets(NOW, 6, 0);
    expect(buckets.map((b) => b.monthKey)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(buckets.every((b) => b.isFuture === false)).toBe(true);
  });

  it("attraversa il presente e marca i mesi futuri", () => {
    const buckets = buildMonthBuckets(NOW, 2, 2);
    expect(buckets.map((b) => b.monthKey)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(buckets.map((b) => b.isFuture)).toEqual([false, false, true, true]);
  });

  it("chiude ogni mese sull'inizio del successivo (estremo destro esclusivo)", () => {
    const [bucket] = buildMonthBuckets(NOW, 1, 0);
    expect(bucket.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(bucket.nextStart.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("attraversa il confine d'anno senza perdere mesi", () => {
    const buckets = buildMonthBuckets(new Date("2026-12-10T00:00:00.000Z"), 1, 2);
    expect(buckets.map((b) => b.monthKey)).toEqual([
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });
});
