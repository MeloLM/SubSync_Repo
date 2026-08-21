import { describe, expect, it } from "vitest";

import {
  isActive,
  onlyActive,
  wasActiveInPeriod,
} from "@/lib/subscription-status";

const d = (iso: string) => new Date(iso);

describe("isActive", () => {
  it("considera attivo un abbonamento senza data di cessazione", () => {
    expect(isActive({ canceledAt: null })).toBe(true);
  });

  it("considera cessato un abbonamento con data di cessazione", () => {
    expect(isActive({ canceledAt: d("2026-05-20") })).toBe(false);
  });
});

describe("onlyActive", () => {
  it("filtra i cessati preservando l'ordine", () => {
    const subs = [
      { id: "a", canceledAt: null },
      { id: "b", canceledAt: d("2026-05-20") },
      { id: "c", canceledAt: null },
    ];
    expect(onlyActive(subs).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("restituisce una lista vuota se sono tutti cessati", () => {
    expect(onlyActive([{ canceledAt: d("2026-01-01") }])).toHaveLength(0);
  });
});

describe("wasActiveInPeriod", () => {
  const period = { from: d("2026-06-01"), to: d("2026-07-01") };

  it("include un abbonamento attivo creato prima del periodo", () => {
    const sub = { createdAt: d("2026-01-01"), canceledAt: null };
    expect(wasActiveInPeriod(sub, period.from, period.to)).toBe(true);
  });

  it("esclude un abbonamento creato dopo la fine del periodo", () => {
    const sub = { createdAt: d("2026-07-05"), canceledAt: null };
    expect(wasActiveInPeriod(sub, period.from, period.to)).toBe(false);
  });

  it("include un abbonamento cessato durante il periodo", () => {
    const sub = { createdAt: d("2026-01-01"), canceledAt: d("2026-06-15") };
    expect(wasActiveInPeriod(sub, period.from, period.to)).toBe(true);
  });

  it("esclude un abbonamento cessato prima dell'inizio del periodo", () => {
    const sub = { createdAt: d("2026-01-01"), canceledAt: d("2026-05-31") };
    expect(wasActiveInPeriod(sub, period.from, period.to)).toBe(false);
  });

  it("include la cessazione esattamente all'inizio del periodo", () => {
    const sub = { createdAt: d("2026-01-01"), canceledAt: d("2026-06-01") };
    expect(wasActiveInPeriod(sub, period.from, period.to)).toBe(true);
  });

  it("esclude la creazione esattamente alla fine del periodo (estremo escluso)", () => {
    const sub = { createdAt: d("2026-07-01"), canceledAt: null };
    expect(wasActiveInPeriod(sub, period.from, period.to)).toBe(false);
  });
});
