"use server";

import { GoogleGenAI, Type } from "@google/genai";

import type { BillingCycle, FiscalDocumentType } from "@/lib/generated/prisma";

/**
 * Struttura dati estratta da uno scontrino/fattura dal modello Vision.
 * Mappa sui campi editabili del form abbonamento (per l'auto-fill).
 */
export interface ReceiptExtraction {
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  /** Prossimo rinnovo in formato ISO 8601 "YYYY-MM-DD" (vuoto se non deducibile). */
  nextRenewalDate: string;

  // ─── Fiscalità (Sprint 7) — sempre valorizzati con default logici lato server ───
  /** Aliquota IVA in percentuale (default 22 se non rilevata). */
  vatRate: number;
  /** L'importo include l'IVA (lordo)? Default true (tipico di scontrini/ricevute). */
  amountIsGross: boolean;
  /** Tipo documento rilevato: scontrino/ricevuta (RECEIPT) o fattura (INVOICE). */
  documentType: FiscalDocumentType;
}

/**
 * Risultato tipizzato dell'estrazione. Ritorniamo un discriminated union invece di
 * lanciare: le eccezioni delle Server Action vengono REDATTE in produzione da
 * Next.js (il client riceve un messaggio generico), mentre `error` è un dato
 * intenzionale che raggiunge sempre la UI.
 */
export type ReceiptExtractionResult =
  | { ok: true; data: ReceiptExtraction }
  | { ok: false; error: string };

/** Mappa gli errori del client Gemini a messaggi chiari e azionabili. */
function mapGeminiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\b401\b|api[_ ]?key|unauthenticated|permission|forbidden|\b403\b/i.test(msg)) {
    return "Chiave Gemini non valida o non autorizzata a questo modello.";
  }
  if (/\b429\b|rate.?limit|quota|resource.?exhausted/i.test(msg)) {
    return "Troppe richieste al servizio AI: riprova tra qualche istante.";
  }
  if (/timeout|network|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(msg)) {
    return "Problema di rete con il servizio AI: controlla la connessione e riprova.";
  }
  if (/safety|blocked|candidate/i.test(msg)) {
    return "Il servizio AI non ha potuto analizzare l'immagine: prova con un'altra foto.";
  }
  return "Analisi non riuscita: riprova o inserisci i dati manualmente.";
}

/**
 * JSON Schema che vincola RIGOROSAMENTE l'output del modello: Gemini è forzato a
 * restituire solo questi campi (responseMimeType JSON + responseSchema).
 */
const RECEIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    amount: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    billingCycle: { type: Type.STRING, enum: ["MONTHLY", "YEARLY"] },
    nextRenewalDate: {
      type: Type.STRING,
      description: "Data del prossimo rinnovo in formato YYYY-MM-DD",
    },
    vatRate: {
      type: Type.NUMBER,
      description:
        "Aliquota IVA in percentuale come numero (es. 22, 10, 4). Usa 22 se non indicata.",
    },
    amountIsGross: {
      type: Type.BOOLEAN,
      description:
        "true se l'importo totale include l'IVA (lordo), false se è un imponibile netto.",
    },
    documentType: {
      type: Type.STRING,
      enum: ["RECEIPT", "INVOICE"],
      description:
        "RECEIPT per scontrino/ricevuta, INVOICE per una fattura (con partita IVA/dati fiscali).",
    },
  },
  required: [
    "name",
    "amount",
    "currency",
    "billingCycle",
    "nextRenewalDate",
    "vatRate",
    "amountIsGross",
    "documentType",
  ],
};

const SYSTEM_INSTRUCTION =
  "Sei un estrattore di dati da ricevute e fatture di abbonamenti. " +
  "Analizza l'immagine ed estrai: il nome del servizio (name), l'importo totale " +
  "come numero senza simboli (amount), la valuta in codice ISO-4217 (currency, es. " +
  "EUR o USD) e il ciclo di fatturazione (billingCycle: MONTHLY se mensile, YEARLY " +
  "se annuale; usa MONTHLY se non è indicato). " +
  "Estrai anche la data del prossimo rinnovo (nextRenewalDate). Cerca la data di " +
  "fine del periodo di fatturazione (es. se vedi 'Jun 21-Jul 21, 2026', il prossimo " +
  "rinnovo è '2026-07-21'). Se vedi solo la data di pagamento, calcola il rinnovo " +
  "aggiungendo 1 mese o 1 anno in base al ciclo. Restituisci TASSATIVAMENTE la data " +
  "nel formato ISO 8601 'YYYY-MM-DD'. " +
  "Estrai inoltre i dati FISCALI: l'aliquota IVA in percentuale come numero " +
  "(vatRate, es. 22, 10 o 4; usa 22 se non è indicata). Indica se l'importo totale " +
  "include l'IVA (amountIsGross: true per un lordo comprensivo di IVA, tipico di " +
  "scontrini e ricevute; false solo se il documento mostra chiaramente un imponibile " +
  "netto). Classifica il tipo di documento (documentType: RECEIPT per uno scontrino o " +
  "una ricevuta, INVOICE per una fattura con partita IVA o dati fiscali del fornitore). " +
  "Rispondi esclusivamente con l'oggetto JSON conforme allo schema.";

/** Estrae `mimeType` + base64 puro sia da un data URL sia da base64 grezzo. */
function parseImagePayload(input: string): { mimeType: string; data: string } {
  const match = /^data:(.+?);base64,(.*)$/s.exec(input.trim());
  if (match) return { mimeType: match[1], data: match[2] };
  // Fallback: base64 già "nudo" → assume JPEG.
  return { mimeType: "image/jpeg", data: input.trim() };
}

/**
 * 👁️ Estrae i dati dell'abbonamento da un'immagine (scontrino/fattura) tramite
 * Google Gemini (`gemini-2.5-flash`). L'output è vincolato via `responseSchema`
 * così da alimentare direttamente l'auto-fill del form.
 *
 * Richiede `GEMINI_API_KEY` in `.env.local` (server-only).
 */
export async function extractDataFromReceipt(
  base64Image: string,
): Promise<ReceiptExtractionResult> {
  if (!base64Image) {
    return { ok: false, error: "Immagine mancante: nessun dato da estrarre." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Servizio AI non configurato (GEMINI_API_KEY mancante).",
    };
  }

  const { mimeType, data } = parseImagePayload(base64Image);

  // Chiamata al modello isolata in try/catch: gli errori di rete/API (401/429/…)
  // diventano `error` tipizzati anziché eccezioni redatte in produzione.
  let raw: string | undefined;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data } },
            { text: "Estrai i dati dell'abbonamento da questa ricevuta." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      },
    });
    raw = response.text;
  } catch (err) {
    return { ok: false, error: mapGeminiError(err) };
  }

  if (!raw) {
    return {
      ok: false,
      error: "Il modello non ha restituito dati dalla ricevuta: riprova.",
    };
  }

  let parsed: Partial<ReceiptExtraction>;
  try {
    parsed = JSON.parse(raw) as Partial<ReceiptExtraction>;
  } catch {
    return { ok: false, error: "Risposta del servizio AI non valida: riprova." };
  }

  // Normalizzazione difensiva: lo schema vincola già la forma, qui blindiamo i tipi.
  const billingCycle: BillingCycle =
    parsed.billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";

  // Accetta solo un YYYY-MM-DD valido (compatibile con <input type="date">),
  // altrimenti stringa vuota così il form non riceve una data malformata.
  const rawDate = String(parsed.nextRenewalDate ?? "").trim();
  const nextRenewalDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";

  // Fiscalità: default logici se l'IA non li rileva → mai `undefined` verso il form.
  const parsedVat = Number(parsed.vatRate);
  const vatRate = Number.isFinite(parsedVat) && parsedVat >= 0 ? parsedVat : 22;
  const amountIsGross =
    typeof parsed.amountIsGross === "boolean" ? parsed.amountIsGross : true;
  const documentType: FiscalDocumentType =
    parsed.documentType === "INVOICE" ? "INVOICE" : "RECEIPT";

  return {
    ok: true,
    data: {
      name: String(parsed.name ?? "").trim(),
      amount: Number(parsed.amount ?? 0),
      currency: String(parsed.currency ?? "EUR").trim().toUpperCase(),
      billingCycle,
      nextRenewalDate,
      vatRate,
      amountIsGross,
      documentType,
    },
  };
}
