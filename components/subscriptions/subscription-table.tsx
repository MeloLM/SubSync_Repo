import type { SubscriptionDTO } from "@/types";

import { SubscriptionRow } from "@/components/subscriptions/subscription-row";

/**
 * 🖥️ Tabella desktop degli abbonamenti. Visibile solo da `md:` in su: su mobile
 * subentrano le card (`SubscriptionCard`), eliminando lo scroll orizzontale.
 */
export function SubscriptionTable({
  subscriptions,
}: {
  subscriptions: SubscriptionDTO[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 bg-subsync-card shadow-sm md:block">
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
            <SubscriptionRow key={s.id} s={s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
