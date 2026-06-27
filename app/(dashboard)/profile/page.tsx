import { Lock, LogOut, Trash2, AlertTriangle } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/actions/auth.actions";

export const dynamic = "force-dynamic";

function ReadOnlyField({
  label,
  value,
  type = "text",
  fullWidth = false,
}: {
  label: string;
  value: string;
  type?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      <input
        type={type}
        defaultValue={value}
        readOnly
        className="w-full cursor-default rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-700"
      />
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const email = user.email ?? "—";
  const memberSince = user.created_at
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
        new Date(user.created_at),
      )
    : "—";
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header profilo */}
      <header className="flex items-center gap-5 rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
        <div className="shrink-0 rounded-full bg-gradient-to-br from-subsync-purple to-subsync-cyan p-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={`Avatar di ${email}`}
            className="h-20 w-20 rounded-full bg-subsync-card"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-white">
            {email}
          </h1>
          <p className="truncate text-sm text-zinc-400">Membro dal {memberSince}</p>
        </div>
      </header>

      {/* Card 1 — Account */}
      <section className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Account
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Email" value={email} type="email" fullWidth />
          <ReadOnlyField label="ID utente" value={user.id} fullWidth />
        </div>
      </section>

      {/* Card 2 — Preferenze App */}
      <section className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Preferenze app
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Valuta principale
            </label>
            <select
              defaultValue="EUR"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-700"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fuso orario
            </label>
            <div className="relative">
              <select
                defaultValue="UTC"
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pr-9 text-sm text-zinc-300 opacity-80 outline-none"
              >
                <option value="UTC">UTC — Coordinated Universal Time</option>
              </select>
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              Bloccato su UTC per la coerenza dei calcoli di rinnovo (vincolo architetturale).
            </p>
          </div>
        </div>
      </section>

      {/* Card 3 — Danger Zone */}
      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-400">
          <AlertTriangle className="h-4 w-4" /> Danger zone
        </h2>
        <p className="mb-4 mt-1 text-sm text-zinc-400">
          Azioni sensibili o irreversibili. Procedi con cautela.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" /> Disconnetti
            </button>
          </form>
          <button
            disabled
            title="Disponibile in una prossima release"
            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Elimina account in modo permanente
          </button>
        </div>
      </section>
    </div>
  );
}
