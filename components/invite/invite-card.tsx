"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Share2 } from "lucide-react";

/**
 * Card invito: QR (SVG, generato in locale → nessuna richiesta esterna, PWA/CSP-safe)
 * che codifica la root dinamica dell'app, più "Copia link" e Web Share.
 * L'URL si legge da `window.location.origin` lato client (post-mount).
 */
export function InviteCard() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin);
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiato negli appunti");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossibile copiare il link");
    }
  }

  async function handleShare() {
    if (!url) return;
    // Fallback: se la Web Share API non è supportata → copia negli appunti.
    if (!canShare) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: "SubSync",
        text: "Traccia i tuoi abbonamenti e il Monthly Burn Rate con SubSync.",
        url,
      });
    } catch {
      // Condivisione annullata dall'utente: nessun errore da mostrare.
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm sm:p-8">
      {/* QR su sfondo chiaro per garantire la scansionabilità (tema app scuro). */}
      <div className="rounded-2xl bg-white p-4">
        {url ? (
          <QRCodeSVG
            value={url}
            size={200}
            bgColor="#ffffff"
            fgColor="#020617"
            level="M"
            marginSize={0}
          />
        ) : (
          <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-zinc-200" />
        )}
      </div>

      <p className="text-center text-sm text-zinc-400">
        Inquadra il codice per aprire e installare{" "}
        <span className="font-medium text-zinc-200">SubSync</span>.
      </p>

      <div className="w-full truncate rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-center text-sm text-zinc-300">
        {url || "…"}
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          {copied ? (
            <Check className="h-4 w-4 text-subsync-cyan" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copiato!" : "Copia link"}
        </button>

        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-subsync-purple px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
          >
            <Share2 className="h-4 w-4" /> Condividi
          </button>
        )}
      </div>
    </div>
  );
}
