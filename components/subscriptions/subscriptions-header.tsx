import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Intestazione della pagina Abbonamenti: titolo + CTA "Aggiungi".
 * Mobile-First: in colonna su mobile, in riga da `sm:` in su.
 */
export function SubscriptionsHeader() {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Abbonamenti
        </h1>
        <p className="text-sm text-zinc-400">I tuoi costi ricorrenti attivi.</p>
      </div>
      <Link
        href="/subscriptions/new"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
      >
        <Plus className="h-4 w-4" /> Aggiungi Abbonamento
      </Link>
    </header>
  );
}
