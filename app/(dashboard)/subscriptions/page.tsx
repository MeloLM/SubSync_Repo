import { listSubscriptions } from "@/actions/subscription.actions";
import { SubscriptionsHeader } from "@/components/subscriptions/subscriptions-header";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";

export const dynamic = "force-dynamic";

/**
 * Pagina Abbonamenti — componente "sottile" (Regola 5): recupera i dati e delega
 * intestazione e lista ai micro-componenti dedicati (card mobile / tabella desktop).
 */
export default async function SubscriptionsPage() {
  const subscriptions = await listSubscriptions();

  return (
    <div className="mx-auto max-w-5xl">
      <SubscriptionsHeader />
      <SubscriptionList subscriptions={subscriptions} />
    </div>
  );
}
