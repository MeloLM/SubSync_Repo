import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";

import type { SubscriptionDTO } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";

import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { SubscriptionTable } from "@/components/subscriptions/subscription-table";

/**
 * Orchestratore della lista abbonamenti (Regola 5, Mobile-First):
 *  - vuota → EmptyState con CTA;
 *  - mobile (default) → griglia di card;
 *  - desktop (`md:`) → tabella.
 */
export function SubscriptionList({
  subscriptions,
}: {
  subscriptions: SubscriptionDTO[];
}) {
  if (subscriptions.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {/* 📱 Mobile: card impilate */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {subscriptions.map((s) => (
          <SubscriptionCard key={s.id} s={s} />
        ))}
      </div>

      {/* 🖥️ Desktop: tabella */}
      <SubscriptionTable subscriptions={subscriptions} />
    </>
  );
}
