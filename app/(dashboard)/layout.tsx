import Link from "next/link";
import { CreditCard, LayoutDashboard, Receipt, Users2 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { countPendingInvites } from "@/actions/split.actions";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Abbonamenti", icon: CreditCard },
  { href: "/payments", label: "Pagamenti", icon: Receipt },
  { href: "/shared", label: "Condivisi", icon: Users2 },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const email = user.email ?? "utente";
  const initial = email.charAt(0).toUpperCase();
  const pendingInvites = await countPendingInvites();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-zinc-800 bg-subsync-card p-4">
        <div className="mb-8 bg-gradient-to-r from-subsync-purple to-subsync-cyan bg-clip-text px-2 text-lg font-bold tracking-tight text-transparent">
          SubSync
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
              {href === "/shared" && pendingInvites > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-subsync-purple px-1.5 text-xs font-bold text-white">
                  {pendingInvites}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Profilo utente — in fondo alla sidebar */}
        <Link
          href="/profile"
          className="mt-auto flex items-center gap-3 rounded-lg border border-zinc-800 p-2 transition-colors hover:bg-zinc-800"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-subsync-purple to-subsync-cyan text-sm font-bold text-white">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-zinc-100">
              {email}
            </span>
            <span className="block truncate text-xs text-zinc-400">
              Profilo e impostazioni
            </span>
          </span>
        </Link>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
