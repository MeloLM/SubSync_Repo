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
 * 📊 Grafico di spesa — BarChart Recharts con selettori e selezione interattiva.
 *
 * Riceve un DTO con **tutte** le serie già aggregate lato server (Regola 4): qui
 * si fa SOLO presentazione, e cambiare vista è un `useState`, non un round-trip.
 *
 * Barre e non aree, anche per gli addebiti: i punti sono totali discreti e
 * un'area interpolerebbe valori inesistenti fra un punto e l'altro. Sul flusso
 * di cassa l'argomento è più forte, non più debole — fra un picco e l'altro il
 * valore reale è zero, e una rampa continua verso i 120 € di novembre
 * suggerirebbe una spesa progressiva che non avviene.
 */

// Design system "Graphite & Neon". Recharts disegna SVG: servono i valori,
// non le classi Tailwind. Tenere allineati a `tailwind.config.ts`.
const PURPLE = "#8B5CF6";
const CYAN = "#06B6D4";
const GRID = "#3F3F46"; // zinc-700
const AXIS_TEXT = "#71717A"; // zinc-500

/** Opacità delle barre previste, quando la serie mostra anche il consolidato. */
const PROJECTED_OPACITY = 0.4;
/** Opacità delle barre escluse da una selezione attiva. */
const UNSELECTED_OPACITY = 0.3;

type Metric = "accrual" | "cash";
type Range = "30d" | "6m" | "1y";

const METRIC_OPTIONS = [
  { value: "accrual" as const, label: "Spesa media" },
  { value: "cash" as const, label: "Addebiti reali" },
];

const RANGE_OPTIONS = [
  { value: "30d" as const, label: "30 giorni" },
  { value: "6m" as const, label: "6 mesi" },
  { value: "1y" as const, label: "1 anno" },
];

/** Didascalia e stato vuoto dipendono dalla vista, non dal numero di punti. */
const CAPTIONS: Record<string, string> = {
  "accrual-6m": "Quanto spendi in media ogni mese, ultimi 6 mesi",
  "accrual-1y": "Quanto spendi in media ogni mese, 6 trascorsi e 6 previsti",
  "cash-6m": "Quanto è uscito davvero dal conto, ultimi 6 mesi",
  "cash-1y": "Quanto è uscito e quanto uscirà, 12 mesi",
  "cash-30d": "Cosa ti viene addebitato, giorno per giorno",
};

const EMPTY_STATES: Record<string, string> = {
  "accrual-6m":
    "Nessun abbonamento attivo negli ultimi 6 mesi. Il grafico si popola al primo abbonamento inserito.",
  "accrual-1y":
    "Nessun abbonamento attivo in questo periodo. Il grafico si popola al primo abbonamento inserito.",
  "cash-6m":
    "Nessuna uscita registrata negli ultimi 6 mesi. Lo storico si popola al primo rinnovo.",
  "cash-1y": "Nessuna uscita registrata o prevista in questo periodo.",
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

/**
 * Converte un importo "12.34" in **centesimi interi**.
 *
 * La somma della selezione è l'unica aggregazione monetaria che avviene sul
 * client, ed è una deroga consapevole: dipende da cosa l'utente clicca, quindi
 * non può essere precalcolata sul server senza un round-trip per ogni click.
 *
 * Quello che NON si deroga è la Regola 1: nessun `float` tocca gli importi. La
 * somma avviene su interi (esatti in JS fino a 2^53, cioè miliardi di miliardi
 * di centesimi) e la divisione per 100 arriva solo alla fine, al confine di
 * presentazione, esattamente come fa `formatMoney` lato server.
 *
 * I valori arrivano dal DTO già a due decimali fissi (`toFixed(2)`), quindi il
 * parsing è deterministico e non passa da `Number(x) * 100`, che reintrodurrebbe
 * l'aritmetica in virgola mobile.
 */
function toCents(fixed2: string): number {
  const negative = fixed2.startsWith("-");
  const [whole, frac = ""] = (negative ? fixed2.slice(1) : fixed2).split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}

export function SpendingChart({ data }: { data: DashboardChartsDTO }) {
  const [metric, setMetric] = useState<Metric>("accrual");
  const [range, setRange] = useState<Range>("6m");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  // La vista a 30 giorni esiste solo per gli addebiti reali: una spesa media al
  // giorno non significa nulla. Invece di forzare lo stato, si deriva la metrica
  // effettiva — così tornando a 6 mesi o 1 anno si ritrova la scelta precedente.
  const effectiveMetric: Metric = range === "30d" ? "cash" : metric;
  const viewKey = `${effectiveMetric}-${range}`;

  const series = pickSeries(data, effectiveMetric, range);
  const { currency } = data;

  // Cambiare vista azzera la selezione: le chiavi appartengono alla serie che le
  // ha prodotte, e trascinarle altrove lascerebbe una selezione invisibile che
  // continua però a pilotare il totale nel footer.
  const changeMetric = (next: Metric) => {
    setMetric(next);
    setSelection(new Set());
  };
  const changeRange = (next: Range) => {
    setRange(next);
    setSelection(new Set());
  };

  const toggleSelection = (key: string) => {
    setSelection((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  };

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

  const hasSelection = selection.size > 0;

  // Somma in centesimi interi, mai in virgola mobile (vedi `toCents`).
  const totalCents = hasSelection
    ? points.reduce(
        (acc, point) => (selection.has(point.key) ? acc + toCents(point.total) : acc),
        0,
      )
    : toCents(series.total);

  // La distinzione consolidato/previsto si disegna solo se la serie contiene
  // entrambi: attenuare tutte le barre non comunicherebbe nulla.
  const showsBoundary =
    points.some((p) => p.isFuture) && points.some((p) => !p.isFuture);
  const firstFutureName = points.find((p) => p.isFuture)?.name;

  /** Recharts espone il punto in forme diverse a seconda della versione. */
  const resolveKey = (entry: unknown, index: number): string | undefined => {
    const direct = (entry as { key?: unknown } | undefined)?.key;
    if (typeof direct === "string") return direct;
    const nested = (entry as { payload?: { key?: unknown } } | undefined)?.payload
      ?.key;
    if (typeof nested === "string") return nested;
    return points[index]?.key;
  };

  const toggles = (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <ChartToggle
        label="Tipo di spesa"
        value={effectiveMetric}
        onChange={changeMetric}
        options={METRIC_OPTIONS.map((option) => ({
          ...option,
          disabled: range === "30d" && option.value === "accrual",
          disabledHint: "La spesa media si calcola sul mese, non sul giorno.",
        }))}
      />
      <ChartToggle
        label="Periodo"
        value={range}
        onChange={changeRange}
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
              minTickGap={16}
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
                const note = selection.has(point.key)
                  ? "selezionato"
                  : showsBoundary && point.isFuture
                    ? "previsto"
                    : undefined;

                return (
                  <ChartTooltip
                    label={point.fullLabel}
                    value={formatCurrency(point.value)}
                    note={note}
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

            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              onClick={(entry: unknown, index: number) => {
                const key = resolveKey(entry, index);
                if (key) toggleSelection(key);
              }}
            >
              {points.map((point) => (
                <Cell
                  key={point.key}
                  cursor="pointer"
                  fill="url(#spendingBar)"
                  // Con una selezione attiva è lei a comandare l'opacità: due
                  // gerarchie visive sovrapposte non si leggerebbero.
                  fillOpacity={
                    hasSelection
                      ? selection.has(point.key)
                        ? 1
                        : UNSELECTED_OPACITY
                      : showsBoundary && point.isFuture
                        ? PROJECTED_OPACITY
                        : 1
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Parità da tastiera: le barre SVG non sono raggiungibili con Tab, questi
          controlli sì. Visibili solo quando ricevono il focus. */}
      <div
        role="group"
        aria-label="Seleziona i periodi da sommare"
        className="flex flex-wrap gap-1"
      >
        {points.map((point) => (
          <button
            key={point.key}
            type="button"
            onClick={() => toggleSelection(point.key)}
            aria-pressed={selection.has(point.key)}
            className="sr-only focus:not-sr-only focus:rounded focus:border focus:border-subsync-cyan focus:px-2 focus:py-1 focus:text-xs focus:text-zinc-200"
          >
            {point.fullLabel} — {formatCurrency(point.value)}
          </button>
        ))}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <span className="text-xs text-zinc-500">
          {hasSelection
            ? "Tocca una barra per aggiungerla o toglierla"
            : CAPTIONS[viewKey]}
          {showsBoundary && !hasSelection ? (
            <span className="ml-2 text-zinc-600">— barre chiare: previsione</span>
          ) : null}
        </span>

        <div className="flex items-center gap-3">
          {hasSelection ? (
            <button
              type="button"
              onClick={() => setSelection(new Set())}
              className="rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subsync-cyan"
            >
              Azzera
            </button>
          ) : null}

          <div className="text-right">
            <span className="block text-[11px] text-zinc-500">
              {hasSelection
                ? `Totale selezione · ${selection.size}`
                : "Totale del periodo"}
            </span>
            <span className="block text-sm font-semibold tabular-nums text-zinc-200">
              {formatCurrency(totalCents / 100)}
            </span>
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
