import type { SubscriptionDTO } from "@/types";
import { formatMoney } from "@/lib/money";
import { formatDateUTC } from "@/lib/date";

import { CycleBadge } from "@/components/subscriptions/cycle-badge";
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";

/**
 * 📱 Vista primaria mobile: card impilata per un singolo abbonamento.
 * Nessuno scroll orizzontale, tap target ampi. Nascosta da `md:` in su.
 */
export function SubscriptionCard({ s }: { s: SubscriptionDTO }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-subsync-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-100">{s.name}</p>
          <p className="mt-1 text-xs text-zinc-400">
            Rinnovo {formatDateUTC(s.nextRenewalDate)}
          </p>
        </div>
        <p className="shrink-0 text-right font-semibold tabular-nums text-zinc-100">
          {formatMoney(s.amount, s.currency)}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <CycleBadge cycle={s.billingCycle} />
        <SubscriptionActions id={s.id} name={s.name} />
      </div>
    </div>
  );
}
