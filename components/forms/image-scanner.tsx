"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ImageUp, Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";

import {
  extractDataFromReceipt,
  type ReceiptExtraction,
} from "@/actions/vision.actions";

/** Limite dimensione file caricabile (pre-compressione). */
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Comprime/ridimensiona un'immagine lato client via <canvas> prima dell'upload:
 * riduce il lato lungo e ri-encoda in JPEG. Alleggerisce il payload della Server
 * Action (evita il limite body) e velocizza/abbassa i costi della chiamata AI.
 * Restituisce un data URL JPEG (usato sia come anteprima sia come input della Action).
 */
function compressImage(
  file: File,
  maxDim = 1400,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas non disponibile in questo browser."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Immagine non leggibile."));
    };
    img.src = objectUrl;
  });
}

interface ImageScannerProps {
  /** Callback di auto-fill: riceve i campi estratti per popolare il form. */
  onExtract?: (data: ReceiptExtraction) => void;
}

/**
 * 👁️ AI Receipt Scanner — dropzone per scontrino/fattura.
 *
 * Client Component: legge l'immagine, la comprime lato client, la inoltra alla
 * Server Action `extractDataFromReceipt` (Google Gemini) e propaga i dati via
 * `onExtract` per la compilazione automatica del form abbonamento.
 */
export function ImageScanner({ onExtract }: ImageScannerProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setPreview(null);
    setFileName(null);
  }

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const tooLarge = rejections[0]?.errors?.some(
          (e) => e.code === "file-too-large",
        );
        toast.error("File non valido", {
          description: tooLarge
            ? "Immagine troppo grande (max 15 MB)."
            : "Carica un'immagine (PNG/JPG) dello scontrino.",
        });
        return;
      }
      const file = accepted[0];
      if (!file) return;
      setFileName(file.name);

      startTransition(async () => {
        try {
          const dataUrl = await compressImage(file);
          setPreview(dataUrl);
          const result = await extractDataFromReceipt(dataUrl);
          if (!result.ok) {
            toast.error("Scansione non riuscita", {
              description: result.error,
            });
            return;
          }
          // Il feedback di successo è a carico del consumer (onExtract).
          onExtract?.(result.data);
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
    maxSize: MAX_FILE_BYTES,
    disabled: isPending,
  });

  return (
    <div className="space-y-3">
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
          PNG o JPG (max 15 MB) · compilazione automatica del form
        </p>
      </div>

      {/* Anteprima + annulla — fuori dalla dropzone per non intercettarne i click. */}
      {preview && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Anteprima scontrino"
              className="h-full w-full object-cover"
            />
            {isPending && (
              <span className="absolute inset-0 grid place-items-center bg-black/50">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
            {fileName ?? "Immagine caricata"}
          </span>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            aria-label="Annulla immagine"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
