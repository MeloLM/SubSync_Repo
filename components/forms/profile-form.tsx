"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, User } from "lucide-react";

import { updateDisplayName } from "@/actions/auth.actions";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-subsync-purple";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400";

/**
 * Form del nome visualizzato — Regola 5 (UI modulare).
 *
 * La pagina profilo è un Server Component: serve un confine client esplicito per
 * lo stato del campo, il `useTransition` e il toast. Qui dentro non c'è logica di
 * dominio, solo la chiamata alla Server Action.
 *
 * Il pulsante di salvataggio resta inattivo finché il campo non cambia davvero:
 * un salvataggio che non salva niente produrrebbe un toast di successo senza che
 * sia successo nulla, e insegnerebbe all'utente a non fidarsi del feedback.
 */
export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  const isDirty = name.trim() !== initialName.trim();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isDirty || isPending) return;

    const fd = new FormData(e.currentTarget);
    const submitted = name.trim();

    startTransition(async () => {
      const res = await updateDisplayName(fd);

      if (res.error) {
        toast.error("Aggiornamento non riuscito", { description: res.error });
        return;
      }

      toast.success(submitted ? "Nome aggiornato" : "Nome rimosso", {
        description: submitted
          ? `Da ora compari come ${submitted}.`
          : "Tornerai a comparire con la tua email.",
      });
      // La Server Action invalida già la cache del profilo; `refresh` riporta il
      // Server Component aggiornato senza un ricaricamento completo della pagina.
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="sm:col-span-2">
      <label htmlFor="fullName" className={labelCls}>
        Nome
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            placeholder="Come vuoi essere chiamato"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={!isDirty || isPending}
          className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg bg-subsync-purple px-4 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Salva
        </button>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        Lascia il campo vuoto per tornare a comparire con la tua email.
      </p>
    </form>
  );
}
