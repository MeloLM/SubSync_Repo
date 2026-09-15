"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { money, type Money } from "@/lib/money";
import { toUtcMidnight, utcDateClamped } from "@/lib/date";
import { getCurrentUser } from "@/lib/auth";

/**
 * 🧪 Strumenti di sviluppo — popolamento di dati finti per il collaudo visivo.
 *
 * ⚠️⚠️ QUESTA AZIONE CANCELLA TUTTI GLI ABBONAMENTI DELL'UTENTE CORRENTE ⚠️⚠️
 *
 * ed è una cancellazione **fisica**, non la disdetta logica di
 * `cancelSubscription`: porta via con sé i `PaymentLog` e i membri condivisi via
 * cascade. È l'unico punto del progetto in cui una `delete` è il comportamento
 * corretto — si vuole una lavagna pulita, non uno storico inquinato — ed è
 * esattamente per questo che sta dietro due cancelli.
 *
 * ┌─ Perché due e non uno ────────────────────────────────────────────────────┐
 * │ `NODE_ENV === "development"` dice come gira Next.js, NON a quale database  │
 * │ è collegato. In questo progetto `.env.local` punta `DATABASE_URL` al       │
 * │ pooler Supabase di produzione, e `next dev` carica `.env.local`: il        │
 * │ controllo su NODE_ENV passa mentre si è connessi ai dati veri.             │
 * │                                                                            │
 * │ Il secondo cancello guarda dove punta la connessione. Se è un database     │
 * │ locale non chiede niente; se non lo è pretende un consenso esplicito,      │
 * │ perché «ho lanciato il seed e mi sono cancellato gli abbonamenti veri» non │
 * │ è un errore da cui si torna indietro.                                     │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Per lavorare in locale: in `.env` sono già pronte, commentate, le due righe
 * che puntano al Postgres di Docker (`docker compose up -d`).
 */

export type SeedResult =
  | { ok: true; subscriptions: number; payments: number }
  | { ok: false; error: string };

/** La connessione punta a un database in esecuzione su questa macchina? */
function targetsLocalDatabase(): boolean {
  try {
    const host = new URL(process.env.DATABASE_URL ?? "").hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false; // URL assente o illeggibile: non si dà per buono niente
  }
}

interface SeedSpec {
  name: string;
  amount: string;
  cycle: "MONTHLY" | "YEARLY";
  /** Giorno del mese del rinnovo: sparpagliati, così la vista a 30 giorni respira. */
  day: number;
  /**
   * Mesi da oggi al prossimo rinnovo. Per i mensili è ignorato (si usa la
   * prossima occorrenza del giorno); per gli annuali è ciò che distribuisce i
   * picchi sul grafico a 1 anno.
   */
  renewInMonths?: number;
  createdMonthsAgo: number;
  canceledMonthsAgo?: number;
  /** Importo dei pagamenti più vecchi di 4 mesi: simula un aumento di prezzo. */
  formerAmount?: string;
}

/**
 * Tredici abbonamenti costruiti per far vedere qualcosa in ogni vista:
 *
 * - i **mensili** danno la linea di base in tutti i mesi e, con i giorni
 *   sparpagliati, riempiono la vista a 30 giorni;
 * - gli **annuali** sono i picchi, distribuiti sui mesi futuri (+1, +2, +5) e
 *   passati (−2, −3 tramite il rinnovo precedente) così la finestra a 1 anno ha
 *   rilievi da entrambe le parti della linea "oggi";
 * - uno **disdetto** due mesi fa, perché la serie per competenza deve poter
 *   scendere: è il comportamento che il soft-delete è servito a garantire;
 * - uno con un **aumento di prezzo** a metà storico, così la cassa passata
 *   mostra un gradino invece di una riga piatta.
 */
const SEED: SeedSpec[] = [
  // ─── Mensili: la base ─────────────────────────────────────────────────────
  { name: "Netflix Premium", amount: "17.99", cycle: "MONTHLY", day: 3, createdMonthsAgo: 16, formerAmount: "13.99" },
  { name: "Spotify Family", amount: "17.99", cycle: "MONTHLY", day: 8, createdMonthsAgo: 14 },
  { name: "iCloud+ 2 TB", amount: "9.99", cycle: "MONTHLY", day: 12, createdMonthsAgo: 11 },
  { name: "Palestra Fitness Club", amount: "49.00", cycle: "MONTHLY", day: 15, createdMonthsAgo: 13 },
  { name: "ChatGPT Plus", amount: "22.00", cycle: "MONTHLY", day: 20, createdMonthsAgo: 10 },
  { name: "Vercel Pro", amount: "20.00", cycle: "MONTHLY", day: 24, createdMonthsAgo: 15 },
  { name: "Amazon Web Services", amount: "34.50", cycle: "MONTHLY", day: 28, createdMonthsAgo: 15 },

  // ─── Annuali: i picchi ────────────────────────────────────────────────────
  { name: "Adobe Creative Cloud", amount: "763.08", cycle: "YEARLY", day: 6, renewInMonths: 1, createdMonthsAgo: 14 },
  { name: "Assicurazione auto", amount: "612.00", cycle: "YEARLY", day: 18, renewInMonths: 2, createdMonthsAgo: 16 },
  { name: "Microsoft 365 Family", amount: "99.00", cycle: "YEARLY", day: 22, renewInMonths: 5, createdMonthsAgo: 14 },
  { name: "NordVPN", amount: "59.90", cycle: "YEARLY", day: 14, renewInMonths: 9, createdMonthsAgo: 16 },
  { name: "Dominio e hosting", amount: "148.00", cycle: "YEARLY", day: 9, renewInMonths: 10, createdMonthsAgo: 15 },

  // ─── Disdetto: la serie deve poter scendere ───────────────────────────────
  { name: "Disney+", amount: "11.99", cycle: "MONTHLY", day: 5, createdMonthsAgo: 14, canceledMonthsAgo: 2 },
];

/** Pagamenti generati all'indietro per abbonamento: copre la finestra a 6 mesi. */
const MAX_PAST_PAYMENTS = 8;
/** Da quanti mesi vale il prezzo attuale, per gli abbonamenti con `formerAmount`. */
const PRICE_CHANGE_MONTHS_AGO = 4;

/** Data spostata di `months` rispetto a `from`, con il giorno saturato (Regola 2). */
function shiftMonths(from: Date, months: number, day: number): Date {
  return utcDateClamped(from.getUTCFullYear(), from.getUTCMonth() + months, day);
}

/** Rinnovo precedente: l'inverso di `advanceRenewalDate`, stessa saturazione. */
function previousRenewal(date: Date, cycle: "MONTHLY" | "YEARLY"): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return cycle === "YEARLY"
    ? utcDateClamped(y - 1, m, d)
    : utcDateClamped(y, m - 1, d);
}

/** Prossima occorrenza di `day` a partire da oggi: mai una data già passata. */
function nextMonthlyOccurrence(now: Date, day: number): Date {
  const thisMonth = shiftMonths(now, 0, day);
  return thisMonth > now ? thisMonth : shiftMonths(now, 1, day);
}

export async function seedMockData(): Promise<SeedResult> {
  // 🔒 Cancello 1 — come gira Next.js.
  if (process.env.NODE_ENV !== "development") {
    return {
      ok: false,
      error: "Il seed è disponibile solo in sviluppo (`next dev`).",
    };
  }

  // 🔒 Cancello 2 — dove punta il database. Vedi il docblock in cima.
  if (!targetsLocalDatabase() && process.env.ALLOW_DEV_SEED !== "1") {
    return {
      ok: false,
      error:
        "DATABASE_URL non punta a un database locale: il seed cancellerebbe dati reali. " +
        "Passa al Postgres di Docker (le righe sono già pronte in .env), " +
        "oppure imposta ALLOW_DEV_SEED=1 se sai cosa stai facendo.",
    };
  }

  const user = await getCurrentUser();
  const now = new Date();

  // Garantisce il record Prisma `User` per la FK, come fa `createSubscription`.
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? `${user.id}@subsync.local` },
    update: {},
  });

  // Lavagna pulita. Cascade porta via PaymentLog e membri condivisi.
  await prisma.subscription.deleteMany({ where: { userId: user.id } });

  let payments = 0;

  // Sequenziale e non in una transazione interattiva: `DATABASE_URL` passa dal
  // transaction pooler (pgbouncer), con cui le transazioni interattive di Prisma
  // non vanno d'accordo. Un seed che fallisce a metà si rilancia — è la prima
  // cosa che fa, cancellare tutto.
  for (const spec of SEED) {
    const createdAt = shiftMonths(now, -spec.createdMonthsAgo, 1);
    const canceledAt =
      spec.canceledMonthsAgo === undefined
        ? null
        : shiftMonths(now, -spec.canceledMonthsAgo, spec.day);

    const nextRenewalDate =
      spec.cycle === "YEARLY"
        ? shiftMonths(now, spec.renewInMonths ?? 1, spec.day)
        : nextMonthlyOccurrence(now, spec.day);

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        name: spec.name,
        amount: money(spec.amount), // Regola 1
        currency: "EUR",
        billingCycle: spec.cycle,
        nextRenewalDate: toUtcMidnight(nextRenewalDate), // Regola 2
        createdAt,
        canceledAt,
      },
    });

    // Storico: si cammina all'indietro dal prossimo rinnovo.
    const priceChangedAt = shiftMonths(now, -PRICE_CHANGE_MONTHS_AGO, 1);
    const stopAt = canceledAt ?? now;
    const logs: { subscriptionId: string; amount: Money; paidAt: Date }[] = [];

    let cursor = previousRenewal(nextRenewalDate, spec.cycle);
    for (let i = 0; i < MAX_PAST_PAYMENTS && cursor > createdAt; i++) {
      if (cursor < stopAt) {
        const paid =
          spec.formerAmount !== undefined && cursor < priceChangedAt
            ? spec.formerAmount
            : spec.amount;
        logs.push({
          subscriptionId: subscription.id,
          amount: money(paid),
          paidAt: toUtcMidnight(cursor), // Regola 2
        });
      }
      cursor = previousRenewal(cursor, spec.cycle);
    }

    if (logs.length > 0) {
      await prisma.paymentLog.createMany({ data: logs });
      payments += logs.length;
    }
  }

  // Regola 3. `"layout"` perché il seed cambia tutto: KPI, liste, grafici e
  // conteggio inviti nella barra laterale.
  revalidatePath("/", "layout");

  return { ok: true, subscriptions: SEED.length, payments };
}
