import { Prisma } from "@/lib/generated/prisma";

/**
 * Helper monetari — Regola 1 (ARCHITECTURE.md).
 * Tutti gli importi e i calcoli usano Prisma.Decimal (backed da decimal.js):
 * MAI `number`/`float`, per evitare errori di arrotondamento in virgola mobile.
 */

export type Money = Prisma.Decimal;

/** Zero monetario riutilizzabile come accumulatore iniziale. */
export const ZERO: Prisma.Decimal = new Prisma.Decimal(0);

/** Costruisce un Decimal da una stringa/numero grezzo (es. input di un form). */
export function money(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/**
 * Formatta un importo per la UI. La conversione a number avviene SOLO qui,
 * al confine di presentazione: nessun calcolo viene fatto su float.
 */
export function formatMoney(
  value: Prisma.Decimal | string | number,
  currency = "EUR",
): string {
  const decimal =
    value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(decimal.toNumber());
}
