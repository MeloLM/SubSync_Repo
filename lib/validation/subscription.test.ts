import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";
import { parseInput, isRealCalendarDay } from "@/lib/validation/common";
import {
  createSubscriptionSchema,
  subscriptionIdSchema,
  updateSubscriptionSchema,
} from "@/lib/validation/subscription";

/**
 * Validazione di creazione e modifica degli abbonamenti (Sprint 8, intervento 2).
 * "Adesso" è fissato per rendere deterministico il confine sulla data di rinnovo.
 */

const NOW = new Date("2026-11-25T15:30:00.000Z");

const valid = {
  name: "Netflix",
  amount: "17.99",
  currency: "EUR",
  billingCycle: "MONTHLY",
  nextRenewalDate: "2026-12-01",
};

const create = (overrides: Record<string, unknown> = {}) =>
  parseInput(createSubscriptionSchema({ now: NOW }), { ...valid, ...overrides });

/** Messaggio d'errore, oppure `null` se l'input è valido. */
const errorOf = (overrides: Record<string, unknown> = {}) => {
  const result = create(overrides);
  return result.ok ? null : result.error;
};

describe("createSubscriptionSchema — caso valido", () => {
  it("accetta un abbonamento completo e restituisce i campi normalizzati", () => {
    const result = create();
    expect(result).toEqual({ ok: true, data: expect.objectContaining(valid) });
  });

  it("applica il trim al nome", () => {
    const result = create({ name: "  Spotify  " });
    expect(result.ok && result.data.name).toBe("Spotify");
  });

  it("la valuta omessa vale EUR", () => {
    const { currency: _omitted, ...withoutCurrency } = valid;
    const result = parseInput(createSubscriptionSchema({ now: NOW }), withoutCurrency);
    expect(result.ok && result.data.currency).toBe("EUR");
  });

  it("i campi fiscali sono opzionali e, se assenti, restano assenti", () => {
    const result = create();
    expect(result.ok && "vatRate" in result.data).toBe(false);
  });

  it("scarta le chiavi sconosciute (nessun mass-assignment)", () => {
    const result = create({ userId: "altro-utente", canceledAt: "2020-01-01" });
    expect(result.ok && "userId" in result.data).toBe(false);
    expect(result.ok && "canceledAt" in result.data).toBe(false);
  });

  it("accetta un importo passato come number", () => {
    const result = create({ amount: 9.5 });
    expect(result.ok && result.data.amount).toBe("9.5");
  });
});

describe("name", () => {
  it("rifiuta il nome vuoto o di soli spazi", () => {
    expect(errorOf({ name: "" })).toBe("Il nome è obbligatorio.");
    expect(errorOf({ name: "    " })).toBe("Il nome è obbligatorio.");
  });

  it("rifiuta il nome assente o non testuale", () => {
    expect(errorOf({ name: undefined })).toBe("Il nome è obbligatorio.");
    expect(errorOf({ name: 42 })).toBe("Il nome è obbligatorio.");
  });

  it("accetta 100 caratteri esatti, rifiuta 101 (contati dopo il trim)", () => {
    expect(errorOf({ name: "a".repeat(100) })).toBeNull();
    expect(errorOf({ name: `  ${"a".repeat(100)}  ` })).toBeNull();
    expect(errorOf({ name: "a".repeat(101) })).toBe("Il nome non può superare 100 caratteri.");
  });

  it("rifiuta un nome lunghissimo", () => {
    expect(errorOf({ name: "x".repeat(100_000) })).toMatch(/non può superare/);
  });
});

describe("amount", () => {
  it.each(["0.01", "1", "19.99", "1000000", "1000000.00", "250.5"])("accetta %s", (amount) => {
    expect(errorOf({ amount })).toBeNull();
  });

  it.each(["0", "0.00", "-1", "-0.01"])("rifiuta %s: non è maggiore di zero", (amount) => {
    expect(errorOf({ amount })).not.toBeNull();
  });

  it("il messaggio per zero è esplicito; per il negativo è di formato", () => {
    expect(errorOf({ amount: "0" })).toBe("L'importo deve essere maggiore di zero.");
    expect(errorOf({ amount: "-5" })).toBe(
      "L'importo deve essere un numero con al massimo due decimali.",
    );
  });

  it("rifiuta più di due decimali", () => {
    expect(errorOf({ amount: "1.999" })).toBe(
      "L'importo deve essere un numero con al massimo due decimali.",
    );
  });

  it("rifiuta oltre 1.000.000 (anche di un centesimo)", () => {
    expect(errorOf({ amount: "1000000.01" })).toBe("L'importo non può superare 1.000.000.");
    expect(errorOf({ amount: "99999999" })).toBe("L'importo non può superare 1.000.000.");
  });

  it.each(["", "abc", "1,5", "1e3", "1.", ".5", "NaN", "Infinity", " ", "12 euro"])(
    "rifiuta il testo non numerico %j",
    (amount) => {
      expect(errorOf({ amount })).not.toBeNull();
    },
  );

  it("rifiuta i number non finiti o in notazione esponenziale", () => {
    expect(errorOf({ amount: Number.NaN })).not.toBeNull();
    expect(errorOf({ amount: Number.POSITIVE_INFINITY })).not.toBeNull();
    expect(errorOf({ amount: 1e21 })).not.toBeNull();
  });

  it("rifiuta importo assente, null o di tipo errato", () => {
    expect(errorOf({ amount: undefined })).toBe("L'importo è obbligatorio.");
    expect(errorOf({ amount: null })).toBe("L'importo è obbligatorio.");
    expect(errorOf({ amount: true })).toBe("L'importo è obbligatorio.");
  });

  it("rifiuta una stringa di cifre lunghissima senza lanciare", () => {
    expect(() => errorOf({ amount: "9".repeat(5000) })).not.toThrow();
    expect(errorOf({ amount: "9".repeat(5000) })).not.toBeNull();
  });
});

describe("currency — il caso di formatMoney", () => {
  it.each(["EUR", "USD"])("accetta %s", (currency) => {
    expect(errorOf({ currency })).toBeNull();
  });

  it.each(["eur", "GBP", "EURO", "EU", "", "E U R", "123", "€", " EUR"])(
    "rifiuta la valuta %j",
    (currency) => {
      expect(errorOf({ currency })).toBe("Valuta non supportata: sono ammesse EUR e USD.");
    },
  );

  it("una valuta malformata, se fosse salvata, farebbe lanciare formatMoney: il caso da chiudere", () => {
    // Documenta il guasto a monte: con il codice malformato la dashboard andrebbe in errore.
    expect(() => formatMoney("10", "EU")).toThrow(RangeError);
    // Ogni codice che lo schema lascia passare è invece formattabile.
    for (const currency of ["EUR", "USD"]) {
      expect(errorOf({ currency })).toBeNull();
      expect(() => formatMoney("10", currency)).not.toThrow();
    }
  });
});

describe("billingCycle", () => {
  it.each(["MONTHLY", "YEARLY"])("accetta %s", (billingCycle) => {
    expect(errorOf({ billingCycle })).toBeNull();
  });

  it.each(["WEEKLY", "monthly", "", null, undefined, 1])("rifiuta %j", (billingCycle) => {
    expect(errorOf({ billingCycle })).toBe("Ciclo di fatturazione non valido.");
  });
});

describe("nextRenewalDate — il caso del cron", () => {
  it("accetta oggi (UTC) e le date future", () => {
    expect(errorOf({ nextRenewalDate: "2026-11-25" })).toBeNull();
    expect(errorOf({ nextRenewalDate: "2026-11-26" })).toBeNull();
    expect(errorOf({ nextRenewalDate: "2030-02-28" })).toBeNull();
  });

  it("rifiuta ieri", () => {
    expect(errorOf({ nextRenewalDate: "2026-11-24" })).toBe(
      "La data di rinnovo non può essere nel passato.",
    );
  });

  it("rifiuta il passato remoto: 2015 farebbe creare ~140 PaymentLog in una notte", () => {
    expect(errorOf({ nextRenewalDate: "2015-01-01" })).toBe(
      "La data di rinnovo non può essere nel passato.",
    );
  });

  it("il confine è il giorno UTC, non quello locale", () => {
    // 23:59 UTC del 25: oggi è ancora il 25 in UTC, qualunque sia il fuso del server.
    const lateEvening = new Date("2026-11-25T23:59:59.999Z");
    const schema = createSubscriptionSchema({ now: lateEvening });
    expect(parseInput(schema, { ...valid, nextRenewalDate: "2026-11-25" }).ok).toBe(true);
    expect(parseInput(schema, { ...valid, nextRenewalDate: "2026-11-24" }).ok).toBe(false);

    // 00:00 UTC del 26: il 25 è già passato.
    const justAfterMidnight = new Date("2026-11-26T00:00:00.000Z");
    const nextDay = createSubscriptionSchema({ now: justAfterMidnight });
    expect(parseInput(nextDay, { ...valid, nextRenewalDate: "2026-11-25" }).ok).toBe(false);
  });

  it.each(["26/11/2026", "2026-1-5", "20261126", "2026-11-26T00:00:00Z", "domani", ""])(
    "rifiuta il formato %j",
    (nextRenewalDate) => {
      expect(errorOf({ nextRenewalDate })).not.toBeNull();
    },
  );

  it("taglia gli spazi attorno alla data", () => {
    expect(errorOf({ nextRenewalDate: " 2026-11-26 " })).toBeNull();
  });

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31", "2027-02-29", "2026-11-00"])(
    "rifiuta il giorno inesistente %s",
    (nextRenewalDate) => {
      expect(errorOf({ nextRenewalDate })).toBe("La data di rinnovo non esiste nel calendario.");
    },
  );

  it("riconosce il 29 febbraio solo negli anni bisestili", () => {
    expect(isRealCalendarDay("2028-02-29")).toBe(true);
    expect(isRealCalendarDay("2027-02-29")).toBe(false);
    expect(isRealCalendarDay("2100-02-29")).toBe(false); // secolo non bisestile
    expect(isRealCalendarDay("2000-02-29")).toBe(true);
  });

  it("rifiuta data assente o di tipo errato", () => {
    expect(errorOf({ nextRenewalDate: undefined })).toBe("La data di rinnovo è obbligatoria.");
    expect(errorOf({ nextRenewalDate: 20261126 })).toBe("La data di rinnovo è obbligatoria.");
  });
});

describe("percentuali fiscali", () => {
  const fields = ["vatRate", "costDeductiblePct", "vatDeductiblePct"] as const;

  it.each(fields)("%s accetta i due estremi e i valori intermedi", (field) => {
    for (const value of ["0", "100", "22", "4.5", "0.00", "100.00", 10, 22]) {
      expect(errorOf({ [field]: value })).toBeNull();
    }
  });

  it.each(fields)("%s rifiuta valori fuori da 0–100", (field) => {
    for (const value of ["-0.01", "-1", "100.01", "101", "1000", 150, -5]) {
      expect(errorOf({ [field]: value })).not.toBeNull();
    }
  });

  it.each(fields)("%s rifiuta testo non numerico", (field) => {
    for (const value of ["", "abc", "22%", "1e2", "NaN"]) {
      expect(errorOf({ [field]: value })).not.toBeNull();
    }
  });

  it("i messaggi nominano il campo sbagliato", () => {
    expect(errorOf({ vatRate: "101" })).toMatch(/aliquota IVA/);
    expect(errorOf({ costDeductiblePct: "-1" })).toMatch(/deducibilità del costo/);
    expect(errorOf({ vatDeductiblePct: "500" })).toMatch(/detraibilità dell'IVA/);
  });
});

describe("altri campi fiscali", () => {
  it("accetta gli enum noti e rifiuta gli altri", () => {
    expect(errorOf({ expenseNature: "BUSINESS", vatRegime: "REVERSE_CHARGE", documentType: "INVOICE" })).toBeNull();
    expect(errorOf({ expenseNature: "OTHER" })).toBe("Natura della spesa non valida.");
    expect(errorOf({ vatRegime: "FLAT" })).toBe("Regime IVA non valido.");
    expect(errorOf({ documentType: "PDF" })).toBe("Tipo di documento non valido.");
  });

  it("vatRegime e categoryId possono essere null", () => {
    expect(errorOf({ vatRegime: null, categoryId: null })).toBeNull();
  });

  it("categoryId: identificativo non vuoto e di lunghezza sana (l'appartenenza è dell'action)", () => {
    expect(errorOf({ categoryId: "cm1abc23def" })).toBeNull();
    expect(errorOf({ categoryId: "" })).toBe("Categoria non valida.");
    expect(errorOf({ categoryId: "x".repeat(65) })).toBe("Categoria non valida.");
  });

  it("amountIsGross deve essere un booleano", () => {
    expect(errorOf({ amountIsGross: false })).toBeNull();
    expect(errorOf({ amountIsGross: "true" })).not.toBeNull();
  });

  it("supplierVatId: breve, la stringa vuota diventa null", () => {
    const empty = create({ supplierVatId: "   " });
    expect(empty.ok && empty.data.supplierVatId).toBeNull();
    expect(errorOf({ supplierVatId: "IT12345678901" })).toBeNull();
    expect(errorOf({ supplierVatId: "9".repeat(33) })).toMatch(/non può superare 32/);
  });
});

describe("updateSubscriptionSchema", () => {
  const update = (input: unknown, currentRenewalDate?: string) =>
    parseInput(updateSubscriptionSchema({ now: NOW, currentRenewalDate }), input);

  it("accetta un oggetto vuoto e non inventa default (la valuta non torna a EUR)", () => {
    const result = update({});
    expect(result).toEqual({ ok: true, data: {} });
  });

  it("valida i soli campi presenti", () => {
    expect(update({ name: "Nuovo nome" }).ok).toBe(true);
    expect(update({ amount: "0" }).ok).toBe(false);
    expect(update({ currency: "XXX" }).ok).toBe(false);
    expect(update({ vatRate: "120" }).ok).toBe(false);
    expect(update({ name: "" }).ok).toBe(false);
  });

  it("una data nel passato è respinta se cambia", () => {
    const result = update({ nextRenewalDate: "2015-01-01" }, "2026-12-01");
    expect(result).toEqual({ ok: false, error: "La data di rinnovo non può essere nel passato." });
  });

  it("la data già salvata, anche se scaduta, passa se non cambia (modifica del solo nome)", () => {
    expect(update({ name: "Rinominato", nextRenewalDate: "2026-11-10" }, "2026-11-10").ok).toBe(true);
  });

  it("senza data corrente nota, il passato è respinto", () => {
    expect(update({ nextRenewalDate: "2026-11-10" }).ok).toBe(false);
  });

  it("la deroga vale solo per la data identica: una diversa nel passato è respinta", () => {
    expect(update({ nextRenewalDate: "2026-11-11" }, "2026-11-10").ok).toBe(false);
  });

  it("una data inesistente è respinta anche se coincide con quella salvata", () => {
    expect(update({ nextRenewalDate: "2026-02-30" }, "2026-02-30").ok).toBe(false);
  });
});

describe("subscriptionIdSchema", () => {
  it("accetta un id e lo taglia", () => {
    expect(parseInput(subscriptionIdSchema, " cm1abc ")).toEqual({ ok: true, data: "cm1abc" });
  });

  it.each(["", "   ", undefined, null, 5, "x".repeat(65)])("rifiuta %j", (value) => {
    expect(parseInput(subscriptionIdSchema, value)).toEqual({
      ok: false,
      error: "Abbonamento non valido.",
    });
  });
});

describe("parseInput", () => {
  it("un input che non è un oggetto dà un errore in italiano, non un'eccezione", () => {
    const schema = createSubscriptionSchema({ now: NOW });
    for (const input of [null, undefined, "stringa", 42, []]) {
      const result = parseInput(schema, input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/[a-zàèéìòù]/i);
    }
  });
});
