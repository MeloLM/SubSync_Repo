"use client";

/**
 * Tooltip del grafico di dashboard — Regola 5 (UI modulare).
 *
 * Presentazionale puro e disaccoppiato da Recharts: riceve stringhe già
 * formattate, non il `payload` della libreria. Così il grafico resta l'unico
 * punto che conosce la forma dei dati, e il tooltip è riusabile dalla vista
 * mensile e da quella giornaliera senza rami condizionali al suo interno.
 */
export function ChartTooltip({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  /** Riga di contesto opzionale, es. "proiettato". */
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-subsync-bg px-2.5 py-1.5 text-center shadow-lg">
      <span className="block text-[11px] capitalize text-zinc-400">{label}</span>
      <span className="block text-sm font-semibold tabular-nums text-zinc-100">
        {value}
      </span>
      {note ? (
        <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
          {note}
        </span>
      ) : null}
    </div>
  );
}
