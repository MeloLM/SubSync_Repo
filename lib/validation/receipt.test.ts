import { describe, expect, it } from "vitest";

import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_BYTES,
  RECEIPT_FORMAT_ERROR,
  RECEIPT_INVALID_ERROR,
  RECEIPT_MISSING_ERROR,
  RECEIPT_TOO_LARGE_ERROR,
  base64DecodedSize,
  parseReceiptImage,
} from "@/lib/validation/receipt";

/** Payload dello scanner Gemini (Sprint 8, intervento 3). */

const SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
} as const;

/** Data URL con la firma giusta per il tipo e `size` byte totali di contenuto. */
function dataUrl(mime: keyof typeof SIGNATURES, size = 64, declared: string = mime) {
  const bytes = Buffer.alloc(size);
  Buffer.from(SIGNATURES[mime]).copy(bytes);
  return `data:${declared};base64,${bytes.toString("base64")}`;
}

describe("parseReceiptImage: casi validi", () => {
  it.each(ALLOWED_RECEIPT_MIME_TYPES)("accetta %s", (mime) => {
    const result = parseReceiptImage(dataUrl(mime));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.mimeType).toBe(mime);
      expect(result.data.data).not.toContain("data:");
    }
  });

  it("restituisce il base64 puro, senza prefisso", () => {
    const url = dataUrl("image/png", 32);
    const result = parseReceiptImage(url);
    expect(result).toEqual({
      ok: true,
      data: { mimeType: "image/png", data: url.split(",")[1] },
    });
  });

  it("normalizza il tipo dichiarato in minuscolo", () => {
    const result = parseReceiptImage(dataUrl("image/jpeg", 64, "IMAGE/JPEG"));
    expect(result.ok && result.data.mimeType).toBe("image/jpeg");
  });

  it("ignora gli spazi attorno al payload", () => {
    expect(parseReceiptImage(`  ${dataUrl("image/jpeg")}\n`).ok).toBe(true);
  });

  it("accetta un'immagine esattamente al limite", () => {
    expect(parseReceiptImage(dataUrl("image/jpeg", MAX_RECEIPT_BYTES)).ok).toBe(true);
  });
});

describe("parseReceiptImage: input assente", () => {
  it.each([undefined, null, "", "   ", 42, {}, []])("rifiuta %j", (value) => {
    expect(parseReceiptImage(value)).toEqual({ ok: false, error: RECEIPT_MISSING_ERROR });
  });
});

describe("parseReceiptImage: tipo non ammesso", () => {
  it.each([
    "image/gif",
    "image/svg+xml",
    "image/bmp",
    "image/heic",
    "application/pdf",
    "text/html",
    "application/octet-stream",
  ])("rifiuta %s", (declared) => {
    expect(parseReceiptImage(dataUrl("image/jpeg", 64, declared))).toEqual({
      ok: false,
      error: RECEIPT_FORMAT_ERROR,
    });
  });

  it("rifiuta il base64 nudo, senza prefisso", () => {
    const bare = dataUrl("image/jpeg").split(",")[1];
    expect(parseReceiptImage(bare)).toEqual({ ok: false, error: RECEIPT_FORMAT_ERROR });
  });

  it("rifiuta un data URL non base64", () => {
    expect(parseReceiptImage("data:image/png,abc")).toEqual({
      ok: false,
      error: RECEIPT_FORMAT_ERROR,
    });
  });

  it("rifiuta un URL esterno", () => {
    expect(parseReceiptImage("https://evil.com/a.jpg")).toEqual({
      ok: false,
      error: RECEIPT_FORMAT_ERROR,
    });
  });
});

describe("parseReceiptImage: contenuto non valido", () => {
  it("rifiuta un base64 con caratteri estranei", () => {
    expect(parseReceiptImage("data:image/jpeg;base64,/9j/4AAQ$$$$")).toEqual({
      ok: false,
      error: RECEIPT_INVALID_ERROR,
    });
  });

  it("rifiuta un base64 con lunghezza non multipla di 4", () => {
    expect(parseReceiptImage("data:image/jpeg;base64,/9j/4AA")).toEqual({
      ok: false,
      error: RECEIPT_INVALID_ERROR,
    });
  });

  it("rifiuta un contenuto vuoto dopo il prefisso", () => {
    expect(parseReceiptImage("data:image/jpeg;base64,")).toEqual({
      ok: false,
      error: RECEIPT_INVALID_ERROR,
    });
  });

  it("rifiuta un tipo dichiarato che non corrisponde ai byte (PNG spacciato per JPEG)", () => {
    const png = dataUrl("image/png").split(",")[1];
    expect(parseReceiptImage(`data:image/jpeg;base64,${png}`)).toEqual({
      ok: false,
      error: RECEIPT_INVALID_ERROR,
    });
  });

  it("rifiuta testo qualunque dichiarato come immagine", () => {
    const text = Buffer.from("<script>alert(1)</script>").toString("base64");
    expect(parseReceiptImage(`data:image/png;base64,${text}`)).toEqual({
      ok: false,
      error: RECEIPT_INVALID_ERROR,
    });
  });

  it("rifiuta un RIFF che non è WebP", () => {
    const wav = Buffer.from("RIFF\x24\x00\x00\x00WAVEfmt ").toString("base64");
    expect(parseReceiptImage(`data:image/webp;base64,${wav}`)).toEqual({
      ok: false,
      error: RECEIPT_INVALID_ERROR,
    });
  });
});

describe("parseReceiptImage: dimensione", () => {
  it("rifiuta un'immagine appena oltre il limite", () => {
    expect(parseReceiptImage(dataUrl("image/jpeg", MAX_RECEIPT_BYTES + 3))).toEqual({
      ok: false,
      error: RECEIPT_TOO_LARGE_ERROR,
    });
  });

  it("rifiuta un payload enorme senza analizzarlo", () => {
    const huge = `data:image/jpeg;base64,${"A".repeat(10_000_000)}`;
    expect(parseReceiptImage(huge)).toEqual({ ok: false, error: RECEIPT_TOO_LARGE_ERROR });
  });

  it("il limite in base64 sta sotto serverActions.bodySizeLimit (4mb)", () => {
    const base64Chars = Math.ceil(MAX_RECEIPT_BYTES / 3) * 4;
    expect(base64Chars).toBeLessThan(4 * 1024 * 1024);
  });
});

describe("base64DecodedSize", () => {
  it("conta i byte decodificati, padding incluso", () => {
    expect(base64DecodedSize(Buffer.alloc(3).toString("base64"))).toBe(3);
    expect(base64DecodedSize(Buffer.alloc(4).toString("base64"))).toBe(4);
    expect(base64DecodedSize(Buffer.alloc(5).toString("base64"))).toBe(5);
    expect(base64DecodedSize(Buffer.alloc(1000).toString("base64"))).toBe(1000);
  });
});
