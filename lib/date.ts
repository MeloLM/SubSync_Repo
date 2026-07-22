/**
 * Normalizzazione date — Regola 2 (ARCHITECTURE.md).
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

/**
 * Avanza una data di rinnovo al ciclo successivo mantenendo 00:00:00 UTC
 * (Regola 2): MONTHLY → +1 mese, YEARLY → +1 anno.
 * Usato dal cron job dei rinnovi.
 */
export function advanceRenewalDate(
  date: Date,
  cycle: "MONTHLY" | "YEARLY",
): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return cycle === "YEARLY"
    ? new Date(Date.UTC(y + 1, m, d, 0, 0, 0, 0))
    : new Date(Date.UTC(y, m + 1, d, 0, 0, 0, 0));
}
