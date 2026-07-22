import type { SubscriptionDTO } from "@/types";
import { formatMoney } from "@/lib/money";
import { formatDateUTC } from "@/lib/date";

import { CycleBadge } from "@/components/subscriptions/cycle-badge";
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";

/**
 * 🖥️ Riga della tabella desktop per un singolo abbonamento.
 */
export function SubscriptionRow({ s }: { s: SubscriptionDTO }) {
  return (
    <tr className="transition-colors hover:bg-zinc-800/40">
      <td className="px-6 py-4 font-medium text-zinc-100">{s.name}</td>
      <td className="px-6 py-4">
        <CycleBadge cycle={s.billingCycle} />
      </td>
      <td className="px-6 py-4 tabular-nums text-zinc-400">
        {formatDateUTC(s.nextRenewalDate)}
      </td>
      <td className="px-6 py-4 text-right font-semibold tabular-nums text-zinc-100">
        {formatMoney(s.amount, s.currency)}
      </td>
      <td className="px-6 py-4">
        <SubscriptionActions id={s.id} name={s.name} />
      </td>
    </tr>
  );
}
