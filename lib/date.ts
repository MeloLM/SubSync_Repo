/**
 * Normalizzazione date — Regola 2 (AI_law_subsync.md).
 * Forza qualsiasi data a 00:00:00.000 UTC prima del salvataggio, per evitare
 * bug di fuso orario (off-by-one day) tra client e server.
 *
 * - Stringa "YYYY-MM-DD" (tipico di un <input type="date">): la data calendario
 *   è interpretata come tale e ancorata a mezzanotte UTC.
 * - Date: si prendono i componenti UTC e si azzera l'orario.
 */
export function toUtcMidnight(input: string | Date): Date {
  if (typeof input === "string") {
    const [year, month, day] = input.split("-").map(Number);
    return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0));
  }
  return new Date(
    Date.UTC(
      input.getUTCFullYear(),
      input.getUTCMonth(),
      input.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

/**
 * Formatta una data ISO (UTC) per la UI in it-IT (es. "01 set 2026").
 * Legge i componenti in UTC per coerenza con la Regola 2 (nessun off-by-one).
 */
export function formatDateUTC(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Numero di giorni del mese indicato (UTC). `monthIndex` è 0-based. */
export function daysInUtcMonth(year: number, monthIndex: number): number {
  // Il giorno 0 del mese successivo è l'ultimo giorno di questo mese.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Costruisce una data UTC **saturando** il giorno all'ultimo disponibile del
 * mese, invece di lasciarlo traboccare nel mese successivo.
 *
 * `Date.UTC(2026, 1, 31)` (31 febbraio) trabocca al 3 marzo; questa funzione
 * restituisce il 28 febbraio. `monthIndex` fuori range viene normalizzato, così
 * `monthIndex = 12` significa gennaio dell'anno dopo.
 */
export function utcDateClamped(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  const y = year + Math.floor(monthIndex / 12);
  const m = ((monthIndex % 12) + 12) % 12;
  return new Date(Date.UTC(y, m, Math.min(day, daysInUtcMonth(y, m)), 0, 0, 0, 0));
}

/** Somma `days` giorni a una data, restando a mezzanotte UTC. */
export function addDaysUTC(date: Date, days: number): Date {
  return new Date(toUtcMidnight(date).getTime() + days * 86_400_000);
}

/**
 * Avanza una data di rinnovo al ciclo successivo mantenendo 00:00:00 UTC
 * (Regola 2): MONTHLY → +1 mese, YEARLY → +1 anno.
 *
 * ⚠️ Il giorno viene **saturato**, non fatto traboccare. Un mensile del 31
 * gennaio rinnova il 28 febbraio, non il 3 marzo: la semantica di ogni sistema
 * di billing reale. La versione precedente usava `Date.UTC(y, m + 1, d)` e
 * faceva saltare febbraio del tutto, spostando poi l'abbonamento al giorno 3 in
 * modo permanente.
 *
 * ⚠️ Conseguenza nota: la saturazione è **irreversibile**, perché il giorno di
 * ancoraggio originale non è memorizzato. Dopo un passaggio da un mese corto, il
 * 31 gennaio diventa 28 febbraio e da lì in poi rinnova il 28, non il 31. Il fix
 * completo richiede un campo `anchorDay` sullo schema: fuori ambito qui, ma è la
 * ragione per cui `lib/cash-flow.ts` proietta iterando **questa stessa
 * funzione** invece di ricalcolare dall'ancora — così il grafico e il cron non
 * possono divergere.
 *
 * Usato dal cron job dei rinnovi e dalla proiezione di cassa.
 */
export function advanceRenewalDate(
  date: Date,
  cycle: "MONTHLY" | "YEARLY",
): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return cycle === "YEARLY"
    ? utcDateClamped(y + 1, m, d)
    : utcDateClamped(y, m + 1, d);
}

/** Chiave mese "YYYY-MM" dai componenti UTC di una data (Regola 2). */
export function monthKeyUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Chiave giorno "YYYY-MM-DD" dai componenti UTC di una data (Regola 2). */
export function dayKeyUTC(date: Date): string {
  return `${monthKeyUTC(date)}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Etichetta it-IT ancorata a UTC: evita lo slittamento di mese ai bordi. */
export function formatUTC(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("it-IT", { ...options, timeZone: "UTC" }).format(
    date,
  );
}

/**
 * Un mese della serie: intervallo `[start, nextStart)` più le etichette già
 * pronte per la UI. È lo scheletro temporale condiviso fra il trend per
 * competenza (`lib/spending-trend.ts`) e il flusso di cassa (`lib/cash-flow.ts`),
 * così le due metriche non possono mai finire su griglie diverse.
 */
export interface MonthBucket {
  /** "YYYY-MM" (UTC) — chiave stabile / React key. */
  monthKey: string;
  /** 00:00:00 UTC del primo del mese. */
  start: Date;
  /** Primo istante del mese successivo: estremo destro **esclusivo**. */
  nextStart: Date;
  /** Etichetta breve asse X, es. "mar". */
  name: string;
  /** Etichetta estesa per tooltip, es. "marzo 2026". */
  fullLabel: string;
  /** Il mese inizia dopo quello corrente: la UI lo disegna come proiettato. */
  isFuture: boolean;
}

/**
 * Finestra di mesi contigui attorno a `now`, dal più vecchio al più recente.
 *
 * @param back mesi passati **incluso quello corrente** (6 → mar..ago se siamo ad agosto)
 * @param forward mesi futuri dopo quello corrente
 *
 * La lunghezza è sempre `back + forward`. Con `forward = 0` si ottiene la
 * finestra retrospettiva classica; con entrambi valorizzati, la serie attraversa
 * il presente e `isFuture` marca il confine.
 */
export function buildMonthBuckets(
  now: Date,
  back: number,
  forward: number,
): MonthBucket[] {
  const currentMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const buckets: MonthBucket[] = [];

  for (let offset = -(back - 1); offset <= forward; offset++) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
    );
    const nextStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );

    buckets.push({
      monthKey: monthKeyUTC(start),
      start,
      nextStart,
      name: formatUTC(start, { month: "short" }),
      fullLabel: formatUTC(start, { month: "long", year: "numeric" }),
      isFuture: start.getTime() > currentMonth,
    });
  }

  return buckets;
}
