"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/**
 * Navigazione mobile "a tendina": il pulsante hamburger apre un pannello che
 * scende dall'header (dropdown full-width), NON un offcanvas laterale.
 * Riceve il contenuto della sidebar come `children` (server-rendered).
 *
 * Richiede un genitore posizionato (`relative`): la tendina è `absolute top-full`
 * e si ancora quindi al bordo inferiore dell'header. Si chiude su: toggle del
 * pulsante, tasto Esc, cambio rotta (clic su una voce del menu).
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Chiudi automaticamente quando si naviga.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc per chiudere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Tendina a comparsa: scende dall'header, full-width, sopra il contenuto. */}
      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-zinc-800 bg-subsync-card shadow-xl">
          <div className="flex flex-col p-4">{children}</div>
        </div>
      )}
    </>
  );
}
