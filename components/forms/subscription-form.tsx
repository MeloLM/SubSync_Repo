"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createSubscription,
  updateSubscription,
} from "@/actions/subscription.actions";
import type { BillingCycle } from "@/lib/generated/prisma";
import type { SubscriptionDTO } from "@/types";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-subsync-purple";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400";

/**
 * Form abbonamento — gestisce sia creazione che modifica.
 * Se `initial` è presente → modalità edit (chiama `updateSubscription`),
 * altrimenti creazione (`createSubscription`).
 */
export function SubscriptionForm({ initial }: { initial?: SubscriptionDTO }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") ?? "").trim(),
      amount: String(fd.get("amount") ?? "0"),
      currency: String(fd.get("currency") ?? "EUR"),
      billingCycle: String(fd.get("billingCycle")) as BillingCycle,
      nextRenewalDate: String(fd.get("nextRenewalDate") ?? ""),
    };

    startTransition(async () => {
      try {
        if (initial) {
          await updateSubscription(initial.id, input);
        } else {
          await createSubscription(input);
        }
        toast.success(isEdit ? "Abbonamento aggiornato" : "Abbonamento salvato", {
          description: `${input.name} · ${input.currency} ${input.amount}`,
        });
        router.push("/subscriptions");
        router.refresh();
      } catch (err) {
        toast.error(isEdit ? "Aggiornamento non riuscito" : "Salvataggio non riuscito", {
          description:
            err instanceof Error ? err.message : "Errore durante il salvataggio.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelCls}>
          Nome servizio
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="Es. Netflix"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="amount" className={labelCls}>
            Importo
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.amount}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="currency" className={labelCls}>
            Valuta
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={initial?.currency ?? "EUR"}
            className={inputCls}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="billingCycle" className={labelCls}>
            Ciclo
          </label>
          <select
            id="billingCycle"
            name="billingCycle"
            defaultValue={initial?.billingCycle ?? "MONTHLY"}
            className={inputCls}
          >
            <option value="MONTHLY">Mensile</option>
            <option value="YEARLY">Annuale</option>
          </select>
        </div>
        <div>
          <label htmlFor="nextRenewalDate" className={labelCls}>
            Prossimo rinnovo
          </label>
          <input
            id="nextRenewalDate"
            name="nextRenewalDate"
            type="date"
            required
            defaultValue={initial?.nextRenewalDate.slice(0, 10)}
            className={`${inputCls} [color-scheme:dark]`}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/subscriptions"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          Annulla
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending
            ? "Salvataggio..."
            : isEdit
              ? "Salva modifiche"
              : "Salva abbonamento"}
        </button>
      </div>
    </form>
  );
}
