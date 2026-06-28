"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { respondToInvite } from "@/actions/split.actions";

/** Pulsanti Accetta/Rifiuta per un invito in sospeso (lato invitato). */
export function InviteResponseButtons({
  memberId,
  subscriptionName,
}: {
  memberId: string;
  subscriptionName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(accept: boolean) {
    startTransition(async () => {
      try {
        await respondToInvite(memberId, accept);
        toast.success(accept ? "Invito accettato" : "Invito rifiutato", {
          description: subscriptionName,
        });
        router.refresh();
      } catch (err) {
        toast.error("Operazione non riuscita", {
          description: err instanceof Error ? err.message : "Errore.",
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => respond(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-subsync-purple px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Accetta
      </button>
      <button
        type="button"
        onClick={() => respond(false)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        <X className="h-4 w-4" />
        Rifiuta
      </button>
    </div>
  );
}
