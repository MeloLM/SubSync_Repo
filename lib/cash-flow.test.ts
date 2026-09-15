import { describe, expect, it } from "vitest";

import { ZERO, money, type Money } from "@/lib/money";
import { buildMonthBuckets, toUtcMidnight } from "@/lib/date";
import {
  computeCashFlowSeries,
  computeHistoricalCashFlow,
  computeProjectedCashFlow,
  computeUpcomingRenewals,
  renewalOccurrencesInWindow,
  type CashFlowSubscriptionInput,
} from "@/lib/cash-flow";
import {
  computeNormalizedSeries,
  type TrendSubscriptionInput,
} from "@/lib/spending-trend";

// Riferimento fisso: 21 agosto 2026.
const NOW = new Date("2026-08-21T10:00:00.000Z");

const sub = (
  amount: string,
  billingCycle: "MONTHLY" | "YEARLY",
  nextRenewalDate: string,
  canceledAt: string | null = null,
): CashFlowSubscriptionInput => ({
  amount: money(amount),
  billingCycle,
  nextRenewalDate: toUtcMidnight(nextRenewalDate),
  canceledAt: canceledAt === null ? null : toUtcMidnight(canceledAt),
});

const payment = (amount: string, paidAt: string) => ({
  amount: money(amount),
  paidAt: toUtcMidnight(paidAt),
});

const sum = (values: Money[]): Money =>
  values.reduce((acc, value) => acc.add(value), ZERO);

const day = (date: Date) => date.toISOString().slice(0, 10);

describe("renewalOccurrencesInWindow()", () => {
  const from = toUtcMidnight("2026-08-01");
  const to = toUtcMidnight("2027-08-01");

  it("un mensile produce dodici occorrenze in dodici mesi", () => {
    const dates = renewalOccurrencesInWindow(
      sub("9.99", "MONTHLY", "2026-08-15"),
      from,
      to,
    );
    expect(dates).toHaveLength(12);
    expect(day(dates[0])).toBe("2026-08-15");
    expect(day(dates[11])).toBe("2027-07-15");
  });

  it("un annuale produce una sola occorrenza in una finestra di dodici mesi", () => {
    const dates = renewalOccurrencesInWindow(
      sub("120.00", "YEARLY", "2026-11-03"),
      from,
      to,
    );
    expect(dates.map(day)).toEqual(["2026-11-03"]);
  });

  it("satura il fine mese senza saltare febbraio", () => {
    const dates = renewalOccurrencesInWindow(
      sub("10.00", "MONTHLY", "2027-01-31"),
      toUtcMidnight("2027-01-01"),
      toUtcMidnight("2027-04-01"),
    );
    expect(dates.map(day)).toEqual(["2027-01-31", "2027-02-28", "2027-03-28"]);
  });

  it("scarta un abbonamento cessato: non ha rinnovi futuri", () => {
    expect(
      renewalOccurrencesInWindow(
        sub("9.99", "MONTHLY", "2026-09-15", "2026-08-20"),
        from,
        to,
      ),
    ).toEqual([]);
  });

  it("scorre i rinnovi antecedenti alla finestra senza restituirli", () => {
    const dates = renewalOccurrencesInWindow(
      sub("9.99", "MONTHLY", "2026-02-10"),
      toUtcMidnight("2026-08-01"),
      toUtcMidnight("2026-10-01"),
    );
    expect(dates.map(day)).toEqual(["2026-08-10", "2026-09-10"]);
  });

  it("restituisce una lista vuota se la finestra è degenere", () => {
    expect(
      renewalOccurrencesInWindow(sub("9.99", "MONTHLY", "2026-08-15"), to, from),
    ).toEqual([]);
  });
});

describe("computeProjectedCashFlow()", () => {
  const buckets = buildMonthBuckets(NOW, 1, 3); // ago, set, ott, nov

  it("mette l'importo PIENO nel mese del rinnovo, non normalizzato", () => {
    const series = computeProjectedCashFlow(
      [sub("120.00", "YEARLY", "2026-11-03")],
      buckets,
      buckets[0].start,
    );
    expect(series.map((m) => m.total.toFixed(2))).toEqual([
      "0.00",
      "0.00",
      "0.00",
      "120.00",
    ]);
  });

  it("è la differenza col trend: il picco resta un picco", () => {
    const series = computeProjectedCashFlow(
      [sub("9.99", "MONTHLY", "2026-08-15"), sub("120.00", "YEARLY", "2026-11-03")],
      buckets,
      buckets[0].start,
    );
    //                 ago      set     ott      nov (9.99 + 120)
    expect(series.map((m) => m.total.toFixed(2))).toEqual([
      "9.99",
      "9.99",
      "9.99",
      "129.99",
    ]);
  });

  it("ignora gli abbonamenti cessati", () => {
    const series = computeProjectedCashFlow(
      [sub("50.00", "MONTHLY", "2026-09-01", "2026-08-10")],
      buckets,
      buckets[0].start,
    );
    expect(series.every((m) => m.total.toFixed(2) === "0.00")).toBe(true);
  });

  it("marca come futuri solo i mesi successivi a quello corrente", () => {
    const series = computeProjectedCashFlow([], buckets, buckets[0].start);
    expect(series.map((m) => m.isFuture)).toEqual([false, true, true, true]);
  });
});

describe("computeHistoricalCashFlow()", () => {
  const buckets = buildMonthBuckets(NOW, 3, 0); // giu, lug, ago

  it("aggrega i pagamenti reali nel mese in cui sono avvenuti", () => {
    const series = computeHistoricalCashFlow(
      [
        payment("9.99", "2026-06-15"),
        payment("9.99", "2026-07-15"),
        payment("120.00", "2026-07-20"),
      ],
      buckets,
    );
    expect(series.map((m) => m.total.toFixed(2))).toEqual([
      "9.99",
      "129.99",
      "0.00",
    ]);
  });

  it("ignora i pagamenti fuori finestra", () => {
    const series = computeHistoricalCashFlow(
      [payment("500.00", "2025-01-10")],
      buckets,
    );
    expect(series.every((m) => m.total.toFixed(2) === "0.00")).toBe(true);
  });
});

describe("computeCashFlowSeries()", () => {
  const buckets = buildMonthBuckets(NOW, 1, 1); // ago, set

  it("unisce consolidato e proiettato senza contare due volte il mese corrente", () => {
    // Il cron è già passato: il rinnovo di agosto è un PaymentLog e
    // nextRenewalDate è stata avanzata a settembre.
    const series = computeCashFlowSeries(
      [sub("9.99", "MONTHLY", "2026-09-15")],
      [payment("9.99", "2026-08-15")],
      buckets,
      NOW,
    );
    expect(series.map((m) => m.total.toFixed(2))).toEqual(["9.99", "9.99"]);
  });

  it("proietta i rinnovi successivi a oggi anche dentro il mese corrente", () => {
    const series = computeCashFlowSeries(
      [sub("30.00", "MONTHLY", "2026-08-28")],
      [],
      buckets,
      NOW,
    );
    expect(series[0].total.toFixed(2)).toBe("30.00"); // agosto, dal 28
  });

  it("non proietta un rinnovo di oggi: lo copre il consolidato", () => {
    const series = computeCashFlowSeries(
      [sub("30.00", "MONTHLY", "2026-08-21")],
      [payment("30.00", "2026-08-21")],
      buckets,
      NOW,
    );
    expect(series[0].total.toFixed(2)).toBe("30.00");
  });
});

describe("computeUpcomingRenewals()", () => {
  it("somma gli addebiti dello stesso giorno e scarta i giorni vuoti", () => {
    const days = computeUpcomingRenewals(
      [
        sub("10.00", "MONTHLY", "2026-08-25"),
        sub("5.00", "MONTHLY", "2026-08-25"),
        sub("7.00", "MONTHLY", "2026-09-10"),
      ],
      NOW,
      30,
    );
    expect(days.map((d) => [d.dayKey, d.total.toFixed(2)])).toEqual([
      ["2026-08-25", "15.00"],
      ["2026-09-10", "7.00"],
    ]);
  });

  it("include un rinnovo che cade oggi", () => {
    const days = computeUpcomingRenewals(
      [sub("12.00", "MONTHLY", "2026-08-21")],
      NOW,
      30,
    );
    expect(days.map((d) => d.dayKey)).toEqual(["2026-08-21"]);
  });

  it("esclude ciò che cade oltre la finestra", () => {
    const days = computeUpcomingRenewals(
      [sub("12.00", "MONTHLY", "2026-09-30")],
      NOW,
      30,
    );
    expect(days).toEqual([]);
  });

  it("esclude gli abbonamenti cessati", () => {
    const days = computeUpcomingRenewals(
      [sub("12.00", "MONTHLY", "2026-08-25", "2026-08-01")],
      NOW,
      30,
    );
    expect(days).toEqual([]);
  });
});

/**
 * L'invariante che tiene insieme le due metriche: cassa e competenza
 * distribuiscono lo stesso denaro in forma diversa, e su una finestra di dodici
 * mesi senza variazioni devono totalizzare lo stesso importo — che è poi il
 * Monthly Burn Rate moltiplicato per dodici.
 *
 * È il test che dimostra che la proiezione non inventa né perde denaro.
 */
describe("invariante Σ cassa === Σ competenza (12 mesi)", () => {
  const buckets = buildMonthBuckets(NOW, 1, 11); // corrente + 11 futuri

  const cashSubs = [
    sub("9.99", "MONTHLY", "2026-08-15"),
    sub("120.00", "YEARLY", "2026-11-03"),
  ];

  const trendSubs: TrendSubscriptionInput[] = [
    {
      amount: money("9.99"),
      billingCycle: "MONTHLY",
      createdAt: toUtcMidnight("2025-01-01"),
      canceledAt: null,
    },
    {
      amount: money("120.00"),
      billingCycle: "YEARLY",
      createdAt: toUtcMidnight("2025-01-01"),
      canceledAt: null,
    },
  ];

  it("totalizza lo stesso importo con entrambe le metriche", () => {
    const cash = computeProjectedCashFlow(cashSubs, buckets, buckets[0].start);
    const accrual = computeNormalizedSeries(trendSubs, buckets);

    const cashTotal = sum(cash.map((m) => m.total));
    const accrualTotal = sum(accrual.map((m) => m.total));

    // 12 × 9.99 + 120.00 = 239.88   ===   12 × (9.99 + 120/12) = 239.88
    expect(cashTotal.toFixed(2)).toBe("239.88");
    expect(accrualTotal.toFixed(2)).toBe(cashTotal.toFixed(2));
  });

  it("ma le distribuisce in forma diversa: la cassa ha un picco, la competenza è piatta", () => {
    const cash = computeProjectedCashFlow(cashSubs, buckets, buckets[0].start);
    const accrual = computeNormalizedSeries(trendSubs, buckets);

    // Novembre: l'annuale esce tutto insieme.
    const november = cash.find((m) => m.monthKey === "2026-11");
    expect(november?.total.toFixed(2)).toBe("129.99");

    // La competenza non ha picchi: ogni mese vale il Burn Rate.
    expect(accrual.every((m) => m.total.toFixed(2) === "19.99")).toBe(true);
  });
});
