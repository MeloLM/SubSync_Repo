import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { getSplitOverview } from "@/actions/split.actions";
import { InviteMemberForm } from "@/components/split/invite-member-form";
import { MemberRow } from "@/components/split/member-row";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function SplitPage({
  params,
}: {
  params: { id: string };
}) {
  const overview = await getSplitOverview(params.id);
  if (!overview) notFound();

  const fmt = (v: string) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: overview.currency,
    }).format(Number(v));

  const activeMembers = overview.members.filter((m) => m.status !== "DECLINED");

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/subscriptions"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Abbonamenti
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">
        Condivisione — {overview.subscriptionName}
      </h1>
      <p className="mb-6 text-sm text-zinc-400">
        Dividi il costo con altri account. Il proprietario partecipa sempre con
        quota 1; ogni membro concorre col proprio peso.
      </p>

      {/* Riepilogo quote */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-subsync-card p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Costo totale
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {fmt(overview.amount)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-subsync-card p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            La tua quota
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-subsync-cyan">
            {fmt(overview.ownerShare)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-subsync-card p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Partecipanti
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {activeMembers.length + 1}
          </p>
        </div>
      </div>

      {/* Invito nuovo membro */}
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Invita un partecipante
        </h2>
        <InviteMemberForm subscriptionId={overview.subscriptionId} />
      </div>

      {/* Tabella membri */}
      {overview.members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Nessun partecipante"
          description="Invita qualcuno via email per dividere il costo di questo abbonamento."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-subsync-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-6 py-3 font-medium">Membro</th>
                  <th className="px-6 py-3 font-medium">Stato</th>
                  <th className="px-6 py-3 font-medium">Peso</th>
                  <th className="px-6 py-3 text-right font-medium">Quota dovuta</th>
                  <th className="px-6 py-3 text-center font-medium">Saldo</th>
                  <th className="px-6 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {overview.members.map((m) => (
                  <MemberRow key={m.id} member={m} currency={overview.currency} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
