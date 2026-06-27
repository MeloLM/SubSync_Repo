"use client";

import { useEffect } from "react";

/**
 * Global Error Boundary: ultima rete di sicurezza per gli errori che risalgono
 * oltre il root layout. Sostituisce l'intero documento, quindi DEVE renderizzare
 * i propri tag <html> e <body>.
 */
export default function GlobalError({
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
    <html lang="it">
      <body className="min-h-screen bg-subsync-bg text-zinc-300 antialiased">
        <div className="grid min-h-screen place-items-center p-6">
          <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-zinc-100">Errore critico</h2>
            <p className="mb-6 text-sm text-zinc-400">
              L&apos;applicazione ha riscontrato un errore irreversibile.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Ricarica
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
