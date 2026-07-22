import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { countPendingInvites } from "@/actions/split.actions";
import { SidebarContent } from "@/components/dashboard/sidebar-content";
import { MobileNav } from "@/components/dashboard/mobile-nav";

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
      {/* Sidebar laterale — SOLO desktop (`lg:`); sotto `lg` è del tutto assente */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-zinc-800 bg-subsync-card p-4 lg:flex lg:w-60 lg:flex-col">
        <SidebarContent
          email={email}
          initial={initial}
          pendingInvites={pendingInvites}
        />
      </aside>

      {/* Colonna contenuto: header mobile + main a tutta larghezza */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile — visibile sotto `lg`; `relative` ancora la tendina */}
        <header className="relative flex items-center justify-between border-b border-zinc-800 bg-subsync-card p-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="SubSync"
              width={517}
              height={482}
              priority
              className="h-7 w-auto"
            />
            <span className="bg-gradient-to-r from-subsync-purple to-subsync-cyan bg-clip-text text-base font-bold tracking-tight text-transparent">
              SubSync
            </span>
          </Link>
          <MobileNav>
            <SidebarContent
              email={email}
              initial={initial}
              pendingInvites={pendingInvites}
              showLogo={false}
            />
          </MobileNav>
        </header>

        <main className="w-full flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
