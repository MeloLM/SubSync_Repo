"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Banner Add-to-Home-Screen: intercetta `beforeinstallprompt`, sopprime il
 * mini-infobar del browser e mostra una CTA dedicata. Compare solo quando l'app
 * è installabile (SW + manifest validi, quindi build di produzione).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-zinc-800 bg-subsync-card p-3 shadow-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-subsync-purple to-subsync-cyan text-white">
        <Download className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-100">Installa SubSync</p>
        <p className="truncate text-xs text-zinc-400">
          Aggiungilo alla home per accesso rapido e offline.
        </p>
      </div>
      <button
        onClick={install}
        className="shrink-0 rounded-lg bg-subsync-purple px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
      >
        Installa
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Chiudi"
        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
