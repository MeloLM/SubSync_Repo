import { Users2 } from "lucide-react";

import {
  listPendingInvites,
  listSharedWithMe,
} from "@/actions/split.actions";
import { InviteResponseButtons } from "@/components/split/invite-response-buttons";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const fmt = (v: string, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(Number(v));

const dateUTC = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

export default async function SharedPage() {
  const [invites, shared] = await Promise.all([
    listPendingInvites(),
    listSharedWithMe(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Condivisi</h1>
        <p className="text-sm text-zinc-400">
          Inviti ricevuti e abbonamenti di cui dividi il costo.
        </p>
      </header>

      {/* Inviti in sospeso */}
      {invites.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Inviti in sospeso
          </h2>
          <div className="space-y-3">
            {invites.map((inv) => (
              <div
                key={inv.memberId}
                className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-subsync-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-zinc-100">
                    {inv.subscriptionName}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Da {inv.ownerEmail} · totale {fmt(inv.amount, inv.currency)} ·{" "}
                    la tua quota{" "}
                    <span className="font-medium text-subsync-cyan">
                      {fmt(inv.proposedOwed, inv.currency)}
                    </span>
                  </p>
                </div>
                <InviteResponseButtons
                  memberId={inv.memberId}
                  subscriptionName={inv.subscriptionName}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Condivisi con me */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Condivisi con me
        </h2>

        {shared.length === 0 ? (
          <EmptyState
            icon={<Users2 className="h-6 w-6" />}
            title="Nessun abbonamento condiviso"
            description="Quando accetti un invito, l'abbonamento condiviso comparirà qui con la tua quota."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-subsync-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-6 py-3 font-medium">Servizio</th>
                    <th className="px-6 py-3 font-medium">Proprietario</th>
                    <th className="px-6 py-3 font-medium">Prossimo rinnovo</th>
                    <th className="px-6 py-3 text-right font-medium">La mia quota</th>
                    <th className="px-6 py-3 text-center font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {shared.map((s) => (
                    <tr key={s.memberId} className="transition-colors hover:bg-zinc-800/40">
                      <td className="px-6 py-4 font-medium text-zinc-100">
                        {s.subscriptionName}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{s.ownerEmail}</td>
                      <td className="px-6 py-4 tabular-nums text-zinc-400">
                        {dateUTC(s.nextRenewalDate)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-zinc-100">
                        {fmt(s.myOwed, s.currency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            s.settled
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {s.settled ? "Saldato" : "Da saldare"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
