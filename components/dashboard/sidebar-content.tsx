import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  LayoutDashboard,
  QrCode,
  Receipt,
  Users2,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Abbonamenti", icon: CreditCard },
  { href: "/payments", label: "Pagamenti", icon: Receipt },
  { href: "/shared", label: "Condivisi", icon: Users2 },
  { href: "/invite", label: "Invita", icon: QrCode },
];

/**
 * Contenuto della sidebar (logo + nav + profilo), condiviso tra la sidebar
 * desktop (`<aside>`) e il pannello offcanvas mobile (`MobileNav`).
 * Non ha container proprio: il genitore fornisce `flex flex-col` così che il
 * profilo (`mt-auto`) resti ancorato in fondo in entrambi i contesti.
 */
export function SidebarContent({
  email,
  initial,
  pendingInvites,
  showLogo = true,
}: {
  email: string;
  initial: string;
  pendingInvites: number;
  /** Nasconde il logo quando è già mostrato altrove (es. header mobile). */
  showLogo?: boolean;
}) {
  return (
    <>
      {showLogo && (
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Image
            src="/logo.png"
            alt="SubSync"
            width={517}
            height={482}
            priority
            className="h-8 w-auto"
          />
          <span className="bg-gradient-to-r from-subsync-purple to-subsync-cyan bg-clip-text text-lg font-bold tracking-tight text-transparent">
            SubSync
          </span>
        </Link>
      )}

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
    </>
  );
}
