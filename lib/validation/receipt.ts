import type { ActionResult } from "@/types";

/**
 * Validazione del payload dello scanner Gemini (Sprint 8, intervento 3).
 *
 * Helper puri: nessuna sessione, nessuna chiamata di rete. La sessione e la chiamata
 * a Gemini restano nell'action. Il payload arriva dal client come data URL
 * (`data:image/jpeg;base64,...`) e va controllato PRIMA di spendere una chiamata a
 * pagamento.
 */

/** Tipi immagine ammessi: gli stessi che la dropzone e il canvas possono produrre. */
export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ReceiptMimeType = (typeof ALLOWED_RECEIPT_MIME_TYPES)[number];

/**
 * Dimensione massima dell'immagine **decodificata**, in byte.
 *
 * Coerente con `serverActions.bodySizeLimit` ("4mb" = 4 194 304 byte) di
 * `next.config.mjs`: il base64 gonfia di 4/3, quindi 3 000 000 byte diventano
 * 4 000 000 caratteri, che con il prefisso del data URL e l'involucro della Server
 * Action restano sotto il tetto. Oltre quella soglia Next.js rifiuterebbe comunque
 * il body: qui il messaggio è nostro e arriva alla UI. Se si cambia uno dei due
 * limiti, va cambiato anche l'altro.
 */
export const MAX_RECEIPT_BYTES = 3_000_000;

/** Lunghezza massima del base64 corrispondente (4 caratteri ogni 3 byte, con padding). */
const MAX_BASE64_CHARS = Math.ceil(MAX_RECEIPT_BYTES / 3) * 4;

export const RECEIPT_MISSING_ERROR = "Immagine mancante: nessun dato da estrarre.";
export const RECEIPT_FORMAT_ERROR =
  "Formato immagine non supportato: carica un file JPEG, PNG o WebP.";
export const RECEIPT_TOO_LARGE_ERROR =
  "Immagine troppo grande: riduci la dimensione e riprova.";
export const RECEIPT_INVALID_ERROR = "Immagine non valida o danneggiata.";

const DATA_URL_HEADER = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i;
const BASE64_BODY = /^[A-Za-z0-9+/]+={0,2}$/;

/** `true` se l'inizio del contenuto decodificato corrisponde al tipo dichiarato. */
function matchesSignature(mimeType: ReceiptMimeType, head: Uint8Array): boolean {
  const startsWith = (bytes: number[], offset = 0) =>
    head.length >= offset + bytes.length &&
    bytes.every((byte, i) => head[offset + i] === byte);

  switch (mimeType) {
    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      // "RIFF" + 4 byte di dimensione + "WEBP"
      return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8);
  }
}

/** Dimensione in byte del contenuto di una stringa base64 valida (padding incluso). */
export function base64DecodedSize(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

/**
 * Controlla il data URL dello scontrino e ne restituisce tipo e base64 puro.
 *
 * Rifiuta: non stringa o vuota, non in forma `data:<tipo>;base64,...`, tipo diverso
 * da JPEG/PNG/WebP, base64 malformato, oltre {@link MAX_RECEIPT_BYTES}, contenuto
 * che non corrisponde al tipo dichiarato (controllo sui primi byte). Il base64 nudo
 * senza prefisso non è più accettato: il client manda sempre un data URL.
 */
export function parseReceiptImage(
  input: unknown,
): ActionResult<{ mimeType: ReceiptMimeType; data: string }> {
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, error: RECEIPT_MISSING_ERROR };
  }

  const payload = input.trim();

  // Taglio sulla lunghezza PRIMA di qualsiasi analisi: nessuna regex gira su un
  // input di dimensione arbitraria.
  if (payload.length > MAX_BASE64_CHARS + 100) {
    return { ok: false, error: RECEIPT_TOO_LARGE_ERROR };
  }

  const header = DATA_URL_HEADER.exec(payload);
  if (!header) return { ok: false, error: RECEIPT_FORMAT_ERROR };

  const mimeType = header[1].toLowerCase();
  if (!(ALLOWED_RECEIPT_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: RECEIPT_FORMAT_ERROR };
  }

  const data = payload.slice(header[0].length);
  if (data.length === 0 || data.length % 4 !== 0 || !BASE64_BODY.test(data)) {
    return { ok: false, error: RECEIPT_INVALID_ERROR };
  }

  if (base64DecodedSize(data) > MAX_RECEIPT_BYTES) {
    return { ok: false, error: RECEIPT_TOO_LARGE_ERROR };
  }

  // Solo i primi byte: 16 caratteri base64 = 12 byte, quanto basta per le firme.
  const head = Buffer.from(data.slice(0, 16), "base64");
  if (!matchesSignature(mimeType as ReceiptMimeType, head)) {
    return { ok: false, error: RECEIPT_INVALID_ERROR };
  }

  return { ok: true, data: { mimeType: mimeType as ReceiptMimeType, data } };
}
