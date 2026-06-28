import Link from "next/link";
import { CreditCard, Pencil, Plus, Users } from "lucide-react";

import { listSubscriptions } from "@/actions/subscription.actions";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteSubscriptionButton } from "@/components/subscriptions/delete-subscription-button";

export const dynamic = "force-dynamic";

const eur = (v: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(v));

const dateUTC = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

function CycleBadge({ cycle }: { cycle: string }) {
  const isMonthly = cycle === "MONTHLY";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isMonthly
          ? "border-subsync-cyan/30 bg-subsync-cyan/10 text-subsync-cyan"
          : "border-subsync-purple/30 bg-subsync-purple/10 text-subsync-purple"
      }`}
    >
      {isMonthly ? "Mensile" : "Annuale"}
    </span>
  );
}

export default async function SubscriptionsPage() {
  const subscriptions = await listSubscriptions();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Abbonamenti</h1>
          <p className="text-sm text-zinc-400">I tuoi costi ricorrenti attivi.</p>
        </div>
        <Link
          href="/subscriptions/new"
          className="inline-flex items-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          <Plus className="h-4 w-4" /> Aggiungi Abbonamento
        </Link>
      </header>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="Nessun abbonamento"
          description="Aggiungi il tuo primo servizio per iniziare a tracciare il Monthly Burn Rate."
          action={
            <Link
              href="/subscriptions/new"
              className="inline-flex items-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              <Plus className="h-4 w-4" /> Aggiungi Abbonamento
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-subsync-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-3 font-medium">Servizio</th>
                  <th className="px-6 py-3 font-medium">Ciclo</th>
                  <th className="px-6 py-3 font-medium">Prossimo rinnovo</th>
                  <th className="px-6 py-3 text-right font-medium">Importo</th>
                  <th className="px-6 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-zinc-800/40">
                    <td className="px-6 py-4 font-medium text-zinc-100">{s.name}</td>
                    <td className="px-6 py-4">
                      <CycleBadge cycle={s.billingCycle} />
                    </td>
                    <td className="px-6 py-4 tabular-nums text-zinc-400">{dateUTC(s.nextRenewalDate)}</td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-zinc-100">
                      {eur(s.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/subscriptions/${s.id}/split`}
                          aria-label={`Condividi ${s.name}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                        >
                          <Users className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/subscriptions/${s.id}/edit`}
                          aria-label={`Modifica ${s.name}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <DeleteSubscriptionButton id={s.id} name={s.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
