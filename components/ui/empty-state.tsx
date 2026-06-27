import type { ReactNode } from "react";

/**
 * Empty State riutilizzabile: mostrato quando una lista è vuota
 * (es. nessun abbonamento / nessun pagamento). Accetta un'icona, un testo e
 * una CTA opzionale.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-800 bg-subsync-card px-6 py-16 text-center">
      {icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-zinc-800 text-zinc-400">
          {icon}
        </span>
      )}
      <h3 className="mb-1 text-base font-semibold text-zinc-100">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-zinc-400">{description}</p>
      {action}
    </div>
  );
}
