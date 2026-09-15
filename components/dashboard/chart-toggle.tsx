"use client";

/**
 * Selettore segmentato del grafico di dashboard — Regola 5 (UI modulare).
 *
 * Vive in un file suo perché `spending-chart.tsx` ne monta due (metrica e
 * finestra) e inglobarli lo trasformerebbe nel file monolitico che la regola
 * vieta. È generico sul tipo del valore, così i due selettori restano tipizzati
 * sui rispettivi insiemi di opzioni senza stringhe libere.
 *
 * Mobile-first (Regola 6): a tutta larghezza con i segmenti che si dividono lo
 * spazio sotto `sm:`, compatto e allineato a destra da lì in su.
 */

export interface ChartToggleOption<T extends string> {
  value: T;
  label: string;
  /** Opzione non applicabile nel contesto corrente (es. competenza a 30 giorni). */
  disabled?: boolean;
  /** Spiegazione del perché è disabilitata: diventa il `title` del pulsante. */
  disabledHint?: string;
}

export function ChartToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Etichetta del gruppo per gli screen reader. */
  label: string;
  options: ChartToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex w-full gap-1 rounded-lg border border-zinc-800 bg-subsync-bg p-1 sm:w-auto"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={isActive}
            title={option.disabled ? option.disabledHint : undefined}
            className={[
              "min-h-[36px] flex-1 rounded-md px-3 text-xs font-medium transition-colors sm:flex-none",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subsync-cyan",
              option.disabled
                ? "cursor-not-allowed text-zinc-600"
                : isActive
                  ? "bg-zinc-800 text-subsync-cyan shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
