"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SpendingTrendDTO } from "@/types";

/**
 * 📊 Trend di spesa — BarChart Recharts.
 *
 * Riceve un DTO già aggregato lato server (Regola 4): qui si fa SOLO
 * presentazione. La conversione `Number()` è confinata al valore da disegnare e
 * ai formatter, mai usata per calcolare denaro.
 *
 * Barre e non area: i punti sono totali mensili discreti, e un'area
 * interpolerebbe visivamente valori fra un mese e l'altro che non esistono.
 */

// Design system "Graphite & Neon". Recharts disegna SVG: servono i valori,
// non le classi Tailwind. Tenere allineati a `tailwind.config.ts`.
const PURPLE = "#8B5CF6";
const CYAN = "#06B6D4";
const GRID = "#3F3F46"; // zinc-700
const AXIS_TEXT = "#71717A"; // zinc-500

export function SpendingChart({ data }: { data: SpendingTrendDTO }) {
  const { points, currency, windowMonths, total } = data;

  // Formatter locale: NON importiamo lib/money (server-only, dipende da Prisma).
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(value);

  const formatAxis = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);

  // Number SOLO per la geometria del grafico (confine di presentazione).
  const series = points.map((point) => ({ ...point, value: Number(point.total) }));
  const max = Math.max(...series.map((p) => p.value), 0);
  const currentKey = points[points.length - 1]?.monthKey;

  if (max <= 0) {
    return (
      <div className="grid h-48 place-items-center rounded-xl border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500">
        Nessun abbonamento attivo negli ultimi {windowMonths} mesi. Il grafico si
        popola al primo abbonamento inserito.
      </div>
    );
  }

  return (
    <figure>
      {/* ResponsiveContainer: larghezza fluida, altezza fissa. Mobile-first —
          l'altezza cresce solo da sm: in su, dove c'è spazio verticale. */}
      <div className="h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series}
            margin={{ top: 8, right: 4, bottom: 0, left: -16 }}
          >
            <defs>
              <linearGradient id="spendingBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CYAN} />
                <stop offset="100%" stopColor={PURPLE} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke={GRID}
              strokeDasharray="3 3"
              opacity={0.4}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              dy={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              tickFormatter={formatAxis}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "#FFFFFF", opacity: 0.04 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof series)[number];
                return (
                  <div className="rounded-lg border border-zinc-700 bg-subsync-bg px-2.5 py-1.5 text-center shadow-lg">
                    <span className="block text-[11px] capitalize text-zinc-400">
                      {point.fullLabel}
                    </span>
                    <span className="block text-sm font-semibold tabular-nums text-zinc-100">
                      {formatCurrency(point.value)}
                    </span>
                  </div>
                );
              }}
            />

            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {series.map((point) => (
                <Cell
                  key={point.monthKey}
                  fill="url(#spendingBar)"
                  // Mese corrente pieno, gli altri attenuati: stessa gerarchia
                  // visiva del resto della dashboard.
                  fillOpacity={point.monthKey === currentKey ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-4 flex items-baseline justify-between">
        <span className="text-xs text-zinc-500">
          Costo normalizzato cumulato, ultimi {windowMonths} mesi
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-200">
          {formatCurrency(Number(total))}
        </span>
      </figcaption>
    </figure>
  );
}
