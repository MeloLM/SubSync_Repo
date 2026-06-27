"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Error Boundary del route group (dashboard).
 * Cattura gli errori di rendering/data-fetching delle pagine applicative
 * (es. sessione Supabase assente → `getCurrentUser` lancia) senza far crollare
 * l'intera app: la sidebar/layout restano montati.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h2 className="mb-1 text-lg font-semibold text-zinc-100">
          Qualcosa è andato storto
        </h2>
        <p className="mb-6 text-sm text-zinc-400">
          {error.message || "Errore imprevisto durante il caricamento della pagina."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          <RotateCw className="h-4 w-4" /> Riprova
        </button>
      </div>
    </div>
  );
}
