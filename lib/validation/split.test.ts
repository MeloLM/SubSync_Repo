import { describe, expect, it } from "vitest";

import { parseInput } from "@/lib/validation/common";
import {
  emailSchema,
  inviteMemberSchema,
  memberActionSchema,
  respondToInviteSchema,
  shareWeightSchema,
  updateMemberShareSchema,
} from "@/lib/validation/split";

/** Validazione delle mutazioni dello split-billing (Sprint 8, intervento 2). */

const WEIGHT_ERROR = "La quota deve essere un numero maggiore di zero.";

describe("emailSchema", () => {
  it("normalizza: trim e minuscolo", () => {
    expect(parseInput(emailSchema, "  Mario.Rossi@Example.COM ")).toEqual({
      ok: true,
      data: "mario.rossi@example.com",
    });
  });

  it("accetta forme valide comuni", () => {
    for (const email of ["a@b.it", "nome+tag@dominio.co.uk", "x_y-z@sub.dominio.com"]) {
      expect(parseInput(emailSchema, email).ok).toBe(true);
    }
  });

  it.each(["", "   ", undefined, null])("rifiuta il vuoto %j: email obbligatoria", (value) => {
    expect(parseInput(emailSchema, value)).toEqual({ ok: false, error: "Email obbligatoria." });
  });

  it.each(["mario", "mario@", "@example.com", "mario@@example.com", "mar io@example.com", "mario@example", "mario@.com"])(
    "rifiuta la forma non valida %j",
    (value) => {
      expect(parseInput(emailSchema, value)).toEqual({ ok: false, error: "Email non valida." });
    },
  );

  it("rifiuta un indirizzo più lungo di 254 caratteri", () => {
    const tooLong = `${"a".repeat(250)}@example.com`;
    expect(parseInput(emailSchema, tooLong)).toEqual({ ok: false, error: "Email troppo lunga." });
  });

  it("rifiuta un valore che non è testo", () => {
    expect(parseInput(emailSchema, 123).ok).toBe(false);
  });
});

describe("shareWeightSchema", () => {
  it.each(["1", "0.5", "2.25", "0.0001", "100", "100.00", 1, 2.5, 100])("accetta %j", (value) => {
    expect(parseInput(shareWeightSchema, value).ok).toBe(true);
  });

  it("restituisce una stringa, mai un number (Regola 1)", () => {
    expect(parseInput(shareWeightSchema, 2.5)).toEqual({ ok: true, data: "2.5" });
  });

  it.each(["0", "0.0", 0])("rifiuta zero: %j", (value) => {
    expect(parseInput(shareWeightSchema, value)).toEqual({ ok: false, error: WEIGHT_ERROR });
  });

  it.each(["-1", -1, "-0.5"])("rifiuta il negativo %j", (value) => {
    expect(parseInput(shareWeightSchema, value).ok).toBe(false);
  });

  it("rifiuta oltre 100, anche di poco", () => {
    expect(parseInput(shareWeightSchema, "100.0001")).toEqual({
      ok: false,
      error: "La quota non può superare 100.",
    });
    expect(parseInput(shareWeightSchema, 101).ok).toBe(false);
    expect(parseInput(shareWeightSchema, "1000000").ok).toBe(false);
  });

  it("rifiuta più di quattro decimali", () => {
    expect(parseInput(shareWeightSchema, "1.00001").ok).toBe(false);
  });

  it.each(["", "abc", "1,5", "1e2", "NaN", "Infinity", undefined, null, true])(
    "rifiuta il non numerico %j",
    (value) => {
      expect(parseInput(shareWeightSchema, value).ok).toBe(false);
    },
  );

  it("rifiuta number non finiti", () => {
    expect(parseInput(shareWeightSchema, Number.NaN).ok).toBe(false);
    expect(parseInput(shareWeightSchema, Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  const base = { subscriptionId: "cm1abc", email: "ospite@example.com", shareWeight: "1" };

  it("accetta un invito valido e normalizza l'email", () => {
    expect(parseInput(inviteMemberSchema, { ...base, email: " Ospite@Example.com " })).toEqual({
      ok: true,
      data: { subscriptionId: "cm1abc", email: "ospite@example.com", shareWeight: "1" },
    });
  });

  it("la quota omessa vale 1", () => {
    const { shareWeight: _omitted, ...withoutWeight } = base;
    const result = parseInput(inviteMemberSchema, withoutWeight);
    expect(result.ok && result.data.shareWeight).toBe("1");
  });

  it("rifiuta email, quota o abbonamento non validi", () => {
    expect(parseInput(inviteMemberSchema, { ...base, email: "non-una-email" }).ok).toBe(false);
    expect(parseInput(inviteMemberSchema, { ...base, shareWeight: "0" }).ok).toBe(false);
    expect(parseInput(inviteMemberSchema, { ...base, shareWeight: "101" }).ok).toBe(false);
    expect(parseInput(inviteMemberSchema, { ...base, subscriptionId: "" })).toEqual({
      ok: false,
      error: "Abbonamento non valido.",
    });
  });

  it("scarta le chiavi sconosciute", () => {
    const result = parseInput(inviteMemberSchema, { ...base, status: "ACCEPTED", settled: true });
    expect(result.ok && Object.keys(result.data).sort()).toEqual(["email", "shareWeight", "subscriptionId"]);
  });
});

describe("updateMemberShareSchema", () => {
  it("accetta membro e quota validi", () => {
    expect(parseInput(updateMemberShareSchema, { memberId: "m1", shareWeight: "2" })).toEqual({
      ok: true,
      data: { memberId: "m1", shareWeight: "2" },
    });
  });

  it("rifiuta quota non valida o membro mancante", () => {
    expect(parseInput(updateMemberShareSchema, { memberId: "m1", shareWeight: "-3" }).ok).toBe(false);
    expect(parseInput(updateMemberShareSchema, { memberId: "m1", shareWeight: "150" }).ok).toBe(false);
    expect(parseInput(updateMemberShareSchema, { memberId: "", shareWeight: "1" })).toEqual({
      ok: false,
      error: "Membro non valido.",
    });
  });
});

describe("memberActionSchema (saldato / rimozione)", () => {
  it("accetta un id e rifiuta il vuoto", () => {
    expect(parseInput(memberActionSchema, { memberId: " m1 " })).toEqual({
      ok: true,
      data: { memberId: "m1" },
    });
    expect(parseInput(memberActionSchema, { memberId: "" }).ok).toBe(false);
    expect(parseInput(memberActionSchema, {}).ok).toBe(false);
  });
});

describe("respondToInviteSchema", () => {
  it("accetta id e booleano", () => {
    expect(parseInput(respondToInviteSchema, { memberId: "m1", accept: false })).toEqual({
      ok: true,
      data: { memberId: "m1", accept: false },
    });
  });

  it("rifiuta una risposta che non è un booleano", () => {
    for (const accept of ["true", 1, null, undefined]) {
      expect(parseInput(respondToInviteSchema, { memberId: "m1", accept })).toEqual({
        ok: false,
        error: "Risposta all'invito non valida.",
      });
    }
  });

  it("rifiuta un invito senza id", () => {
    expect(parseInput(respondToInviteSchema, { memberId: "", accept: true })).toEqual({
      ok: false,
      error: "Invito non valido.",
    });
  });
});
