"use client";

import { useRef } from "react";
import { toast } from "sonner";

import { ImageScanner } from "@/components/forms/image-scanner";
import {
  SubscriptionForm,
  type SubscriptionFormHandle,
} from "@/components/forms/subscription-form";
import type { ReceiptExtraction } from "@/actions/vision.actions";

/**
 * Wrapper della pagina "Nuovo abbonamento": monta l'AI Receipt Scanner sopra il
 * form e collega l'auto-fill. Alla ricezione dei dati estratti popola i campi
 * del form (via handle imperativo) e avvisa l'utente di verificarli.
 */
export function SubscriptionScannerForm() {
  const formRef = useRef<SubscriptionFormHandle>(null);

  function handleExtract(data: ReceiptExtraction) {
    formRef.current?.applyExtraction(data);

    // Il form supporta solo EUR/USD: se l'IA rileva un'altra valuta, viene lasciata
    // su EUR (vedi applyExtraction) e l'utente va avvisato di verificarla.
    const unsupportedCurrency =
      data.currency !== "" &&
      data.currency !== "EUR" &&
      data.currency !== "USD";

    if (unsupportedCurrency) {
      toast.warning(`Valuta "${data.currency}" non supportata`, {
        description:
          "Dati compilati, ma la valuta è rimasta su EUR: verificala prima di salvare.",
      });
    } else {
      toast.info("Fattura analizzata! Controlla i dati prima di salvare.");
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
      <ImageScanner onExtract={handleExtract} />

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-600">
        <span className="h-px flex-1 bg-zinc-800" />
        oppure inserisci manualmente
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <SubscriptionForm ref={formRef} />
    </div>
  );
}
