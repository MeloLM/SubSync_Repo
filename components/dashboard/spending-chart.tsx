"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartSeriesDTO, DashboardChartsDTO } from "@/types";
import { ChartToggle } from "@/components/dashboard/chart-toggle";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";

/**
 * 📊 Grafico di spesa — BarChart Recharts con selettori di metrica e finestra.
 *
 * Riceve un DTO con **tutte** le serie già aggregate lato server (Regola 4): qui
 * si fa SOLO presentazione, e cambiare vista è un `useState`, non un round-trip.
 * La conversione `Number()` è confinata al valore da disegnare e ai formatter,
 * mai usata per calcolare denaro.
 *
 * Barre e non aree, anche per la cassa: i punti sono totali discreti e un'area
 * interpolerebbe valori inesistenti fra un punto e l'altro. Sul flusso di cassa
 * l'argomento è più forte, non più debole — fra un picco e l'altro il valore
 * reale è zero, e una rampa continua verso i 120 € di novembre suggerirebbe una
 * spesa progressiva che non avviene.
 */

// Design system "Graphite & Neon". Recharts disegna SVG: servono i valori,
// non le classi Tailwind. Tenere allineati a `tailwind.config.ts`.
const PURPLE = "#8B5CF6";
const CYAN = "#06B6D4";
const GRID = "#3F3F46"; // zinc-700
const AXIS_TEXT = "#71717A"; // zinc-500

/** Opacità delle barre proiettate, quando la serie mostra anche il consolidato. */
const PROJECTED_OPACITY = 0.4;

type Metric = "accrual" | "cash";
type Range = "30d" | "6m" | "1y";

const METRIC_OPTIONS = [
  { value: "accrual" as const, label: "Competenza" },
  { value: "cash" as const, label: "Cassa" },
];

const RANGE_OPTIONS = [
  { value: "30d" as const, label: "1M" },
  { value: "6m" as const, label: "6M" },
  { value: "1y" as const, label: "1A" },
];

/** Didascalia e stato vuoto dipendono dalla vista, non dal numero di punti. */
const CAPTIONS: Record<string, string> = {
  "accrual-6m": "Costo normalizzato, ultimi 6 mesi",
  "accrual-1y": "Costo normalizzato, 6 mesi trascorsi e 6 proiettati",
  "cash-6m": "Uscite reali, ultimi 6 mesi",
  "cash-1y": "Uscite reali e proiettate, 12 mesi",
  "cash-30d": "Addebiti previsti, prossimi 30 giorni",
};

const EMPTY_STATES: Record<string, string> = {
  "accrual-6m":
    "Nessun abbonamento attivo negli ultimi 6 mesi. Il grafico si popola al primo abbonamento inserito.",
  "accrual-1y":
    "Nessun abbonamento attivo in questa finestra. Il grafico si popola al primo abbonamento inserito.",
  "cash-6m":
    "Nessuna uscita registrata negli ultimi 6 mesi. Lo storico di cassa si popola al primo rinnovo.",
  "cash-1y":
    "Nessuna uscita registrata o prevista in questa finestra.",
  "cash-30d": "Nessun addebito previsto nei prossimi 30 giorni.",
};

function pickSeries(
  data: DashboardChartsDTO,
  metric: Metric,
  range: Range,
): ChartSeriesDTO {
  if (range === "30d") return data.cash30d;
  if (metric === "accrual") return range === "6m" ? data.accrual6m : data.accrual1y;
  return range === "6m" ? data.cash6m : data.cash1y;
}

export function SpendingChart({ data }: { data: DashboardChartsDTO }) {
  const [metric, setMetric] = useState<Metric>("accrual");
  const [range, setRange] = useState<Range>("6m");

  // La vista a 30 giorni esiste solo per la cassa: una spesa normalizzata al
  // giorno non significa nulla. Invece di forzare lo stato, si deriva la metrica
  // effettiva — così tornando a 6M o 1A si ritrova la scelta precedente.
  const effectiveMetric: Metric = range === "30d" ? "cash" : metric;
  const viewKey = `${effectiveMetric}-${range}`;

  const series = pickSeries(data, effectiveMetric, range);
  const { currency } = data;

  // Formatter locali: NON importiamo lib/money (server-only, dipende da Prisma).
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
  const points = series.points.map((point) => ({
    ...point,
    value: Number(point.total),
  }));
  const max = Math.max(...points.map((p) => p.value), 0);

  // La distinzione consolidato/proiettato si disegna solo se la serie contiene
  // entrambi: attenuare tutte le barre non comunicherebbe nulla.
  const showsBoundary =
    points.some((p) => p.isFuture) && points.some((p) => !p.isFuture);
  const firstFutureName = points.find((p) => p.isFuture)?.name;

  const toggles = (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <ChartToggle
        label="Metrica"
        value={effectiveMetric}
        onChange={setMetric}
        options={METRIC_OPTIONS.map((option) => ({
          ...option,
          disabled: range === "30d" && option.value === "accrual",
          disabledHint:
            "Il costo normalizzato non è definito a granularità giornaliera.",
        }))}
      />
      <ChartToggle
        label="Finestra temporale"
        value={range}
        onChange={setRange}
        options={RANGE_OPTIONS}
      />
    </div>
  );

  if (max <= 0) {
    return (
      <div>
        {toggles}
        <div className="grid h-48 place-items-center rounded-xl border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500 sm:h-56">
          {EMPTY_STATES[viewKey]}
        </div>
      </div>
    );
  }

  return (
    <figure>
      {toggles}

      {/* ResponsiveContainer: larghezza fluida, altezza fissa. Mobile-first —
          l'altezza cresce solo da sm: in su, dove c'è spazio verticale. */}
      <div className="h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 16, right: 4, bottom: 0, left: -16 }}>
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
              interval="preserveStartEnd"
              minTickGap={6}
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
                const point = payload[0].payload as (typeof points)[number];
                return (
                  <ChartTooltip
                    label={point.fullLabel}
                    value={formatCurrency(point.value)}
                    note={
                      showsBoundary && point.isFuture ? "proiettato" : undefined
                    }
                  />
                );
              }}
            />

            {showsBoundary && firstFutureName ? (
              <ReferenceLine
                x={firstFutureName}
                stroke={AXIS_TEXT}
                strokeDasharray="4 4"
                label={{
                  value: "oggi",
                  position: "top",
                  fill: AXIS_TEXT,
                  fontSize: 10,
                }}
              />
            ) : null}

            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {points.map((point) => (
                <Cell
                  key={point.key}
                  fill="url(#spendingBar)"
                  fillOpacity={
                    showsBoundary && point.isFuture ? PROJECTED_OPACITY : 1
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-xs text-zinc-500">
          {CAPTIONS[viewKey]}
          {showsBoundary ? (
            <span className="ml-2 text-zinc-600">
              — barre attenuate: proiezione
            </span>
          ) : null}
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-200">
          {formatCurrency(Number(series.total))}
        </span>
      </figcaption>
    </figure>
  );
}
