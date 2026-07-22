import Link from "next/link";
import { Pencil, Users } from "lucide-react";

import { DeleteSubscriptionButton } from "@/components/subscriptions/delete-subscription-button";

/**
 * Cluster di azioni per un abbonamento (condividi / modifica / elimina).
 * Riusato sia dalla card mobile sia dalla riga della tabella desktop.
 * Server Component: la sola foglia interattiva è `DeleteSubscriptionButton`.
 */
export function SubscriptionActions({ id, name }: { id: string; name: string }) {
  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white";
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/subscriptions/${id}/split`}
        aria-label={`Condividi ${name}`}
        className={iconBtn}
      >
        <Users className="h-4 w-4" />
      </Link>
      <Link
        href={`/subscriptions/${id}/edit`}
        aria-label={`Modifica ${name}`}
        className={iconBtn}
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <DeleteSubscriptionButton id={id} name={name} />
    </div>
  );
}
