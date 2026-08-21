import { describe, expect, it } from "vitest";

import { money } from "@/lib/money";
import {
  computeNormalizedTrend,
  normalizedMonthlyCost,
  type TrendSubscriptionInput,
} from "@/lib/spending-trend";

const sub = (
  amount: string,
  billingCycle: "MONTHLY" | "YEARLY",
  createdAt: string,
  canceledAt: string | null = null,
): TrendSubscriptionInput => ({
  amount: money(amount),
  billingCycle,
  createdAt: new Date(createdAt),
  canceledAt: canceledAt === null ? null : new Date(canceledAt),
});

// Riferimento fisso: 21 agosto 2026 → finestra mar..ago.
const NOW = new Date("2026-08-21T10:00:00.000Z");

describe("normalizedMonthlyCost", () => {
  it("lascia invariato il costo di un abbonamento mensile", () => {
    expect(
      normalizedMonthlyCost(sub("9.99", "MONTHLY", "2026-01-01")).toFixed(2),
    ).toBe("9.99");
  });

  it("divide per 12 il costo di un abbonamento annuale", () => {
    expect(
      normalizedMonthlyCost(sub("120.00", "YEARLY", "2026-01-01")).toFixed(2),
    ).toBe("10.00");
  });

  it("non arrotonda prima della somma (coerenza col Burn Rate)", () => {
    // 100/12 = 8.333... Tre volte, arrotondando prima, darebbe 25.02.
    const yearly = sub("100.00", "YEARLY", "2026-01-01");
    const total = normalizedMonthlyCost(yearly)
      .add(normalizedMonthlyCost(yearly))
      .add(normalizedMonthlyCost(yearly));
    expect(total.toFixed(2)).toBe("25.00");
  });
});

describe("computeNormalizedTrend", () => {
  it("restituisce esattamente i mesi richiesti, dal più vecchio al corrente", () => {
    const series = computeNormalizedTrend([], NOW, 6);
    expect(series).toHaveLength(6);
    expect(series.map((m) => m.monthKey)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("somma mensili e annuali/12 nello stesso mese", () => {
    const series = computeNormalizedTrend(
      [sub("9.99", "MONTHLY", "2026-01-01"), sub("120.00", "YEARLY", "2026-01-01")],
      NOW,
      6,
    );
    // 9.99 + 10.00 su ogni mese della finestra.
    expect(series.every((m) => m.total.toFixed(2) === "19.99")).toBe(true);
  });

  it("esclude un abbonamento dai mesi precedenti alla sua creazione", () => {
    const series = computeNormalizedTrend(
      [sub("10.00", "MONTHLY", "2026-06-15")],
      NOW,
      6,
    );
    const totals = series.map((m) => m.total.toFixed(2));
    expect(totals).toEqual(["0.00", "0.00", "0.00", "10.00", "10.00", "10.00"]);
  });

  it("include un abbonamento creato l'ultimo giorno del mese", () => {
    const series = computeNormalizedTrend(
      [sub("10.00", "MONTHLY", "2026-06-30T23:59:59.000Z")],
      NOW,
      6,
    );
    expect(series[3].total.toFixed(2)).toBe("10.00"); // giugno
  });

  it("ancora le etichette a UTC, senza slittamenti di mese", () => {
    const series = computeNormalizedTrend([], NOW, 6);
    expect(series[0].monthKey).toBe("2026-03");
    expect(series[5].monthKey).toBe("2026-08");
  });
});

describe("computeNormalizedTrend — soft-delete (canceledAt)", () => {
  it("conta un abbonamento cessato nei mesi in cui era attivo, e non dopo", () => {
    // Attivo da gennaio, disdetto il 20 maggio: contribuisce fino a maggio.
    const series = computeNormalizedTrend(
      [sub("10.00", "MONTHLY", "2026-01-10", "2026-05-20")],
      NOW,
      6,
    );
    const totals = series.map((m) => m.total.toFixed(2));
    //            mar      apr      mag      giu     lug     ago
    expect(totals).toEqual(["10.00", "10.00", "10.00", "0.00", "0.00", "0.00"]);
  });

  it("fa scendere la serie: è il comportamento che il soft-delete deve garantire", () => {
    const series = computeNormalizedTrend(
      [
        sub("10.00", "MONTHLY", "2026-01-01"),
        sub("5.00", "MONTHLY", "2026-01-01", "2026-06-15"),
      ],
      NOW,
      6,
    );
    const totals = series.map((m) => m.total.toFixed(2));
    expect(totals).toEqual(["15.00", "15.00", "15.00", "15.00", "10.00", "10.00"]);
  });

  it("include il mese della cessazione: quel ciclo era già stato pagato", () => {
    const series = computeNormalizedTrend(
      [sub("10.00", "MONTHLY", "2026-01-01", "2026-07-01T00:00:00.000Z")],
      NOW,
      6,
    );
    expect(series[4].total.toFixed(2)).toBe("10.00"); // luglio, mese della disdetta
    expect(series[5].total.toFixed(2)).toBe("0.00"); // agosto
  });

  it("esclude del tutto un abbonamento cessato prima della finestra", () => {
    const series = computeNormalizedTrend(
      [sub("10.00", "MONTHLY", "2025-01-01", "2026-01-15")],
      NOW,
      6,
    );
    expect(series.every((m) => m.total.toFixed(2) === "0.00")).toBe(true);
  });

  it("ignora una cessazione futura rispetto alla creazione nello stesso mese", () => {
    // Creato e disdetto a giugno: contribuisce solo a giugno.
    const series = computeNormalizedTrend(
      [sub("10.00", "MONTHLY", "2026-06-05", "2026-06-25")],
      NOW,
      6,
    );
    const totals = series.map((m) => m.total.toFixed(2));
    expect(totals).toEqual(["0.00", "0.00", "0.00", "10.00", "0.00", "0.00"]);
  });
});
