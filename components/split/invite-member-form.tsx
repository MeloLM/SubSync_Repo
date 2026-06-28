"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { inviteMember } from "@/actions/split.actions";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-subsync-purple";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400";

/** Form di invito di un nuovo membro alla condivisione (lato proprietario). */
export function InviteMemberForm({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const weight = String(fd.get("weight") ?? "1");

    startTransition(async () => {
      try {
        await inviteMember(subscriptionId, email, weight);
        toast.success("Invito inviato", { description: email });
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        toast.error("Invito non riuscito", {
          description: err instanceof Error ? err.message : "Errore.",
        });
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="invite-email" className={labelCls}>
          Email da invitare
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="amico@example.com"
          className={inputCls}
        />
      </div>
      <div className="w-full sm:w-28">
        <label htmlFor="invite-weight" className={labelCls}>
          Quota (peso)
        </label>
        <input
          id="invite-weight"
          name="weight"
          type="number"
          step="0.25"
          min="0.01"
          defaultValue="1"
          className={inputCls}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-subsync-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Invita
      </button>
    </form>
  );
}
