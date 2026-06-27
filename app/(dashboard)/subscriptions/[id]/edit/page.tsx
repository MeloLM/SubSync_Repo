import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSubscription } from "@/actions/subscription.actions";
import { SubscriptionForm } from "@/components/forms/subscription-form";

export const dynamic = "force-dynamic";

export default async function EditSubscriptionPage({
  params,
}: {
  params: { id: string };
}) {
  const subscription = await getSubscription(params.id);
  if (!subscription) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/subscriptions"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Abbonamenti
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">
        Modifica abbonamento
      </h1>
      <p className="mb-6 text-sm text-zinc-400">
        Aggiorna i dettagli di {subscription.name}.
      </p>

      <div className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
        <SubscriptionForm initial={subscription} />
      </div>
    </div>
  );
}
