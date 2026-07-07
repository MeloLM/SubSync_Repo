"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createSubscription,
  updateSubscription,
} from "@/actions/subscription.actions";
import type { ReceiptExtraction } from "@/actions/vision.actions";
import type { BillingCycle } from "@/lib/generated/prisma";
import type { SubscriptionDTO } from "@/types";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-subsync-purple";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400";

/** Handle imperativo esposto via ref: consente l'auto-fill esterno dei campi. */
export interface SubscriptionFormHandle {
  /** Sovrascrive istantaneamente i campi con i dati estratti da una ricevuta. */
  applyExtraction: (data: ReceiptExtraction) => void;
}

/**
 * Form abbonamento — gestisce sia creazione che modifica.
 * Se `initial` è presente → modalità edit (chiama `updateSubscription`),
 * altrimenti creazione (`createSubscription`).
 *
 * I campi sono controllati per permettere l'auto-fill imperativo via
 * `ref.applyExtraction` (AI Receipt Scanner), analogo a `setValue` di RHF.
 */
export const SubscriptionForm = forwardRef<
  SubscriptionFormHandle,
  { initial?: SubscriptionDTO }
>(function SubscriptionForm({ initial }, ref) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    initial?.billingCycle ?? "MONTHLY",
  );
  const [nextRenewalDate, setNextRenewalDate] = useState(
    initial?.nextRenewalDate.slice(0, 10) ?? "",
  );

  useImperativeHandle(
    ref,
    () => ({
      applyExtraction: (data) => {
        setName(data.name);
        setAmount(String(data.amount));
        // Il <select> conosce solo EUR/USD: applica la valuta solo se supportata.
        if (data.currency === "EUR" || data.currency === "USD") {
          setCurrency(data.currency);
        }
        setBillingCycle(data.billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY");
      },
    }),
    [],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = {
      name: name.trim(),
      amount: String(amount || "0"),
      currency,
      billingCycle,
      nextRenewalDate,
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
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
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
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
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
            value={nextRenewalDate}
            onChange={(e) => setNextRenewalDate(e.target.value)}
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
});
