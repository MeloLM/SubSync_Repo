"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Chiave di `localStorage`: contiene l'istante (epoch ms) fino al quale tacere. */
const DISMISS_KEY = "hide_pwa_banner";
/** Durata del silenzio dopo un rifiuto. */
const DISMISS_DAYS = 30;

/**
 * Il rifiuto è stato registrato ed è ancora valido?
 *
 * Ogni accesso a `localStorage` è protetto: in finestra privata, o con i dati del
 * sito bloccati, il solo leggere la proprietà lancia. Un banner di installazione
 * non è un buon motivo per far esplodere la dashboard, quindi in caso di errore si
 * risponde "non rifiutato" e il banner si comporta come prima.
 */
function isDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;

    const until = Number(raw);
    // Valore illeggibile (scritto da una versione precedente, o manomesso) o
    // scadenza superata: si ripulisce e si torna a mostrare il banner.
    if (!Number.isFinite(until) || Date.now() >= until) {
      window.localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Registra il rifiuto per i prossimi `DISMISS_DAYS` giorni. */
function rememberDismissal(): void {
  try {
    window.localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 86_400_000),
    );
  } catch {
    // Storage non disponibile: il rifiuto vale comunque per questa sessione,
    // perché lo stato in memoria nasconde il banner fino al prossimo caricamento.
  }
}

/**
 * Banner Add-to-Home-Screen: intercetta `beforeinstallprompt`, sopprime il
 * mini-infobar del browser e mostra una CTA dedicata. Compare solo quando l'app
 * è installabile (SW + manifest validi, quindi build di produzione).
 *
 * Un rifiuto viene **ricordato per 30 giorni**: prima, chiudere il banner lo
 * nascondeva solo fino al ricaricamento della pagina, e chi non voleva installare
 * l'app se lo ritrovava davanti a ogni visita.
 *
 * ⚠️ `localStorage` si legge in `useEffect`, mai durante il render: leggerlo nel
 * corpo del componente produrrebbe un markup diverso fra server e client, cioè un
 * hydration mismatch. Fino a lettura avvenuta (`checked`) il componente rende
 * `null`, così il banner non lampeggia per un istante prima di sparire.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setHidden(isDismissed());
    setChecked(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    rememberDismissal();
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);

    // Rifiutare la finestra nativa è un "no" come chiudere il banner: senza questo,
    // il banner tornerebbe alla visita successiva nonostante l'utente abbia già
    // detto di no una volta.
    if (outcome === "dismissed") dismiss();
  }

  if (!checked || hidden || !deferred) return null;

  return (
    <div
      role="region"
      aria-label="Installa SubSync"
      className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-zinc-800 bg-subsync-card p-3 shadow-sm"
    >
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
        onClick={dismiss}
        aria-label="Chiudi e non mostrare per 30 giorni"
        title="Non mostrare per 30 giorni"
        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
