"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { deleteSubscription } from "@/actions/subscription.actions";

/**
 * Bottone di eliminazione con dialog di conferma.
 * Conferma → `deleteSubscription` (Server Action) + toast + refresh.
 */
export function DeleteSubscriptionButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSubscription(id);
        toast.success("Abbonamento eliminato", { description: name });
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("Eliminazione non riuscita", {
          description: err instanceof Error ? err.message : "Errore.",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Elimina ${name}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-semibold text-zinc-100">
              Eliminare l&apos;abbonamento?
            </h3>
            <p className="mb-6 text-sm text-zinc-400">
              <span className="font-medium text-zinc-200">{name}</span> verrà
              rimosso definitivamente, insieme allo storico pagamenti collegato.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
