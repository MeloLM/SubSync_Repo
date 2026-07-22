import Image from "next/image";
import Link from "next/link";

/**
 * Layout pubblico per le pagine "marketing"/legali (Privacy, Termini).
 * Non richiede autenticazione: le rotte `/privacy` e `/terms` sono escluse dal
 * middleware (necessarie per l'approvazione OAuth di Google e per la PWA).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-subsync-bg">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="SubSync"
              width={517}
              height={482}
              className="h-7 w-auto"
            />
            <span className="bg-gradient-to-r from-subsync-purple to-subsync-cyan bg-clip-text text-base font-bold tracking-tight text-transparent">
              SubSync
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Accedi
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
