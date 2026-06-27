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
