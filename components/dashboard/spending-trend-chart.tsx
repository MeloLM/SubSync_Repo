"use client";

import type { SpendingTrendDTO } from "@/types";

/**
 * 📊 Grafico a barre "Trend di spesa" — 100% CSS/Tailwind, nessuna libreria.
 *
 * Riceve un DTO già aggregato lato server (Regola 4): qui si fa SOLO
 * presentazione — geometria in pixel e formattazione — mai calcolo monetario.
 * La conversione `Number()` è confinata alla geometria delle barre e al
 * formatter. Serie singola → niente legenda (la nomina il titolo della card);
 * markup semantico `<figure>`/`<figcaption>`.
 */
export function SpendingTrendChart({ data }: { data: SpendingTrendDTO }) {
  const { points, currency, windowMonths, total } = data;

  // Formatter locale (client): NON importiamo lib/money (server-only, Prisma).
  const formatCurrency = (value: string) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
    }).format(Number(value));

  // Number SOLO per la geometria (confine di presentazione), mai per i soldi.
  const max = Math.max(...points.map((p) => Number(p.total)), 0);

  // Stato vuoto: nessuna spesa nella finestra.
  if (max <= 0) {
    return (
      <div className="grid h-48 place-items-center rounded-xl border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500">
        Nessun pagamento negli ultimi {windowMonths} mesi. Lo storico popolerà il
        grafico a ogni rinnovo.
      </div>
    );
  }

  // Mese corrente = ultimo punto della serie.
  const currentKey = points[points.length - 1].monthKey;

  return (
    <figure>
      {/* Area plot: colonne in STRETCH (mai items-end, altrimenti l'altezza %
          delle barre collassa) — la barra si ancora in basso con justify-end. */}
      <div className="flex h-48 gap-2 sm:gap-3">
        {points.map((point) => {
          const value = Number(point.total);
          // Tetto 90% = headroom per il tooltip sopra la barra più alta; min 3%.
          const heightPct = value > 0 ? Math.max((value / max) * 90, 3) : 0;
          const isCurrent = point.monthKey === currentKey;
          const formatted = formatCurrency(point.total);

          return (
            <div
              key={point.monthKey}
              className="group relative flex flex-1 flex-col justify-end"
            >
              {/* Wrapper-barra: porta l'altezza; focusabile da tastiera (a11y). */}
              <div
                className="relative w-full min-h-[2px] rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-subsync-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-subsync-card"
                style={{ height: `${heightPct}%` }}
                tabIndex={0}
                role="img"
                aria-label={`${point.fullLabel}: ${formatted}`}
              >
                {/* Tooltip: fratello del riempimento, ancorato alla cima della
                    barra. Interattività = hover del gruppo + focus da tastiera. */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-subsync-bg px-2.5 py-1.5 text-center opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <span className="block text-[11px] capitalize text-zinc-400">
                    {point.fullLabel}
                  </span>
                  <span className="block text-sm font-semibold tabular-nums text-zinc-100">
                    {formatted}
                  </span>
                </div>

                {/* Riempimento: l'OPACITY sta QUI (non sul wrapper) così il
                    tooltip non entra nello stacking-context e resta sopra le
                    barre vicine. Mese corrente pieno; gli altri attenuati. */}
                <div
                  className={`h-full w-full rounded-t-md bg-gradient-to-t from-subsync-purple to-subsync-cyan transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
                    isCurrent ? "opacity-100" : "opacity-60"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Baseline sotto le barre: zinc-700 (zinc-800 sarebbe invisibile sul
          card #27272A). */}
      <div className="h-px bg-zinc-700" />

      {/* Etichette mesi. */}
      <figcaption className="mt-2 flex gap-2 sm:gap-3">
        {points.map((point) => (
          <span
            key={point.monthKey}
            className={`flex-1 text-center text-xs capitalize tabular-nums ${
              point.monthKey === currentKey
                ? "font-medium text-zinc-300"
                : "text-zinc-500"
            }`}
          >
            {point.monthLabel}
          </span>
        ))}
      </figcaption>

      {/* Footer totale in fondo (NON in alto): libera l'angolo superiore per i
          tooltip, che altrimenti collidono con la barra più alta. */}
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-xs text-zinc-500">
          Totale ultimi {windowMonths} mesi
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-200">
          {formatCurrency(total)}
        </span>
      </div>
    </figure>
  );
}
