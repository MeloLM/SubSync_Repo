"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ImageUp, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import {
  extractDataFromReceipt,
  type ReceiptExtraction,
} from "@/actions/vision.actions";

/**
 * Converte un File nel data URL completo (`data:<mime>;base64,<...>`).
 * Il data URL preserva il mimeType, che la Server Action usa per l'`inlineData`.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Lettura del file non riuscita."));
    reader.readAsDataURL(file);
  });
}

interface ImageScannerProps {
  /** Callback di auto-fill: riceve i campi estratti per popolare il form. */
  onExtract?: (data: ReceiptExtraction) => void;
}

/**
 * 👁️ AI Receipt Scanner — dropzone per scontrino/fattura.
 *
 * Client Component: legge l'immagine, la codifica in base64 e la inoltra alla
 * Server Action `extractDataFromReceipt`, poi propaga i dati via `onExtract`
 * per la compilazione automatica del form abbonamento.
 *
 * ⏳ SCAFFOLDING: la Server Action è mockata finché non arrivano le chiavi API
 * del modello Vision (vedi TODO.md · Sprint 4 · AI Receipt Scanner).
 */
export function ImageScanner({ onExtract }: ImageScannerProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        toast.error("File non valido", {
          description: "Carica un'immagine (PNG/JPG) dello scontrino.",
        });
        return;
      }
      const file = accepted[0];
      if (!file) return;
      setFileName(file.name);

      startTransition(async () => {
        try {
          const dataUrl = await fileToDataUrl(file);
          const data = await extractDataFromReceipt(dataUrl);
          // Il feedback di successo è a carico del consumer (onExtract).
          onExtract?.(data);
        } catch (err) {
          toast.error("Scansione non riuscita", {
            description:
              err instanceof Error ? err.message : "Errore durante la lettura.",
          });
        }
      });
    },
    [onExtract],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    multiple: false,
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-zinc-900/60 px-6 py-7 text-center transition-colors ${
        isDragActive
          ? "border-subsync-purple bg-subsync-purple/5"
          : "border-zinc-700 hover:border-subsync-purple"
      } ${isPending ? "pointer-events-none opacity-70" : ""}`}
    >
      <input {...getInputProps()} />

      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-subsync-purple transition-colors group-hover:bg-subsync-purple/10">
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isDragActive ? (
          <ScanLine className="h-5 w-5" />
        ) : (
          <ImageUp className="h-5 w-5" />
        )}
      </span>

      <p className="text-sm font-medium text-zinc-200">
        {isPending
          ? "Analisi dello scontrino…"
          : isDragActive
            ? "Rilascia qui l'immagine"
            : "Trascina uno scontrino o clicca per caricarlo"}
      </p>
      <p className="text-xs text-zinc-500">
        {fileName ?? "PNG o JPG · compilazione automatica del form"}
      </p>
    </div>
  );
}
