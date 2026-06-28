"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  removeMember,
  toggleMemberSettled,
  updateMemberShare,
  type MemberDTO,
} from "@/actions/split.actions";

const STATUS_STYLES: Record<MemberDTO["status"], { label: string; cls: string }> = {
  PENDING: {
    label: "In attesa",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  ACCEPTED: {
    label: "Attivo",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  DECLINED: {
    label: "Rifiutato",
    cls: "border-zinc-600/40 bg-zinc-700/20 text-zinc-500",
  },
};

/** Riga della tabella membri (lato proprietario): quota, saldo, rimozione. */
export function MemberRow({
  member,
  currency,
}: {
  member: MemberDTO;
  currency: string;
}) {
  const router = useRouter();
  const [weight, setWeight] = useState(member.shareWeight);
  const [isPending, startTransition] = useTransition();

  const owed = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(Number(member.owedAmount));

  const status = STATUS_STYLES[member.status];
  const isDeclined = member.status === "DECLINED";

  function run(fn: () => Promise<void>, errTitle: string) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        toast.error(errTitle, {
          description: err instanceof Error ? err.message : "Errore.",
        });
      }
    });
  }

  function saveWeight() {
    if (weight === member.shareWeight) return;
    run(async () => {
      await updateMemberShare(member.id, weight);
      toast.success("Quota aggiornata", { description: member.email });
    }, "Aggiornamento quota non riuscito");
  }

  function toggleSettled() {
    run(async () => {
      await toggleMemberSettled(member.id);
    }, "Operazione non riuscita");
  }

  function remove() {
    if (!window.confirm(`Rimuovere ${member.email} dalla condivisione?`)) return;
    run(async () => {
      await removeMember(member.id);
      toast.success("Membro rimosso", { description: member.email });
    }, "Rimozione non riuscita");
  }

  return (
    <tr className="transition-colors hover:bg-zinc-800/40">
      <td className="px-6 py-4 font-medium text-zinc-100">{member.email}</td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.cls}`}
        >
          {status.label}
        </span>
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.25"
          min="0.01"
          value={weight}
          disabled={isPending || isDeclined}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={saveWeight}
          className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none transition-colors focus:border-subsync-purple disabled:opacity-50"
        />
      </td>
      <td className="px-6 py-4 text-right font-semibold tabular-nums text-zinc-100">
        {isDeclined ? "—" : owed}
      </td>
      <td className="px-6 py-4 text-center">
        <button
          type="button"
          onClick={toggleSettled}
          disabled={isPending || isDeclined}
          aria-pressed={member.settled}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            member.settled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          <Check className="h-3 w-3" />
          {member.settled ? "Saldato" : "Da saldare"}
        </button>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            aria-label={`Rimuovi ${member.email}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
