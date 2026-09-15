"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, Loader2 } from "lucide-react";

import { seedMockData } from "@/actions/dev.actions";

/**
 * 🧪 Pulsante di popolamento dati — solo sviluppo.
 *
 * Il genitore lo monta unicamente quando `NODE_ENV === "development"`: Next
 * sostituisce quella condizione a build time, quindi in produzione il ramo è
 * codice morto e non raggiunge il bundle.
 *
 * Conferma esplicita prima di procedere. L'azione cancella fisicamente tutti gli
 * abbonamenti dell'utente, e il fatto che sia uno strumento di sviluppo non la
 * rende meno irreversibile: le protezioni vere stanno nella Server Action, questa
 * è solo l'ultima occasione per cambiare idea.
 */
export function SeedButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Cancella TUTTI i tuoi abbonamenti e li sostituisce con dati finti.\n\n" +
        "Operazione irreversibile. Procedere?",
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await seedMockData();

      if (!res.ok) {
        toast.error("Seed non eseguito", { description: res.error });
        return;
      }

      toast.success("Dati di test generati", {
        description: `${res.subscriptions} abbonamenti e ${res.payments} pagamenti nello storico.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-400">
        Sostituisce i tuoi abbonamenti con un set finto, costruito per popolare
        ogni vista del grafico.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Database className="h-4 w-4" />
        )}
        Genera dati di test (seed)
      </button>
    </div>
  );
}
