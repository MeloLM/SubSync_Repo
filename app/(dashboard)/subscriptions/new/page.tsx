import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SubscriptionScannerForm } from "@/components/subscriptions/subscription-scanner-form";

export default function NewSubscriptionPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/subscriptions"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Abbonamenti
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">
        Nuovo abbonamento
      </h1>
      <p className="mb-6 text-sm text-zinc-400">
        Carica una fattura per la compilazione automatica, oppure inserisci il
        servizio manualmente.
      </p>

      <SubscriptionScannerForm />
    </div>
  );
}
