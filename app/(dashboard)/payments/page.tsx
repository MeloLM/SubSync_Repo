import { ArrowDownLeft, Receipt } from "lucide-react";

import { listPayments } from "@/actions/payment.actions";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const eur = (v: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(v));

const dateUTC = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

export default async function PaymentsPage() {
  const payments = await listPayments();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Pagamenti</h1>
        <p className="text-sm text-zinc-400">Storico cronologico delle uscite di cassa.</p>
      </header>

      {payments.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="Nessun pagamento registrato"
          description="Lo storico si popolerà automaticamente a ogni rinnovo o tramite Email Ingestion."
        />
      ) : (
        <div>
          {payments.map((p, i) => (
            <div key={p.id} className="flex gap-4">
              {/* Colonna timeline */}
              <div className="flex flex-col items-center">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-800 bg-subsync-card text-rose-400">
                  <ArrowDownLeft className="h-4 w-4" />
                </span>
                {i < payments.length - 1 && <span className="w-px flex-1 bg-zinc-800" />}
              </div>

              {/* Contenuto */}
              <div className="mb-4 flex flex-1 items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-subsync-card p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-100">{p.name}</p>
                  <p className="text-xs tabular-nums text-zinc-400">{dateUTC(p.paidAt)}</p>
                </div>
                <span className="font-semibold tabular-nums text-zinc-100">-{eur(p.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
