import { describe, expect, it } from "vitest";

import { ZERO, money, splitByWeights, formatMoney } from "@/lib/money";

/**
 * Regola 1 (ARCHITECTURE.md): calcoli monetari sempre in Decimal, mai float.
 * Questi test bloccano l'esattezza aritmetica e la conservazione dei centesimi.
 */

describe("money()", () => {
  it("somma esatta senza errore in virgola mobile (0.1 + 0.2 === 0.3)", () => {
    expect(money("0.1").add(money("0.2")).toString()).toBe("0.3");
  });
});

describe("ZERO", () => {
  it("è l'accumulatore neutro", () => {
    expect(ZERO.add(money("5")).toFixed(2)).toBe("5.00");
  });
});

describe("splitByWeights()", () => {
  it("ripartisce equamente senza perdere né creare centesimi", () => {
    const parts = splitByWeights(money("10.00"), [
      money("1"),
      money("1"),
      money("1"),
    ]);
    expect(parts.map((p) => p.toFixed(2))).toEqual(["3.34", "3.33", "3.33"]);
    const sum = parts.reduce((acc, p) => acc.add(p), ZERO);
    expect(sum.toFixed(2)).toBe("10.00"); // Σ === totale, esatto
  });

  it("rispetta i pesi e conserva la somma", () => {
    const parts = splitByWeights(money("100.00"), [money("2"), money("1")]);
    const sum = parts.reduce((acc, p) => acc.add(p), ZERO);
    expect(sum.toFixed(2)).toBe("100.00");
    expect(parts[0].gt(parts[1])).toBe(true); // peso doppio → quota maggiore
  });

  it("con pesi tutti nulli restituisce zeri", () => {
    const parts = splitByWeights(money("10"), [ZERO, ZERO]);
    expect(parts.map((p) => p.toFixed(2))).toEqual(["0.00", "0.00"]);
  });

  it("array di pesi vuoto → array vuoto", () => {
    expect(splitByWeights(money("10"), [])).toEqual([]);
  });
});

describe("formatMoney()", () => {
  it("formatta in it-IT con la valuta indicata", () => {
    expect(formatMoney(money("17.99"), "EUR")).toMatch(/17,99/);
    expect(formatMoney("17.99", "EUR")).toMatch(/€/);
  });
});
