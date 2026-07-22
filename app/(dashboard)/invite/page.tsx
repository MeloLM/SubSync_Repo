import { InviteCard } from "@/components/invite/invite-card";

/**
 * Schermata "Invita" — condivisione rapida della PWA tramite QR + link.
 * Pagina sottile: la logica interattiva vive in `InviteCard` (client component).
 */
export default function InvitePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Invita</h1>
        <p className="text-sm text-zinc-400">
          Condividi SubSync: chi inquadra il QR può aprirla e installarla al volo.
        </p>
      </header>

      <InviteCard />
    </div>
  );
}
