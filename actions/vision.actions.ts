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
): Promise<ReceiptExtraction> {
  if (!base64Image) {
    throw new Error("Immagine mancante: nessun dato da estrarre.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY non configurata: imposta la chiave in .env.local.",
    );
  }

  const { mimeType, data } = parseImagePayload(base64Image);
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

  const raw = response.text;
  if (!raw) {
    throw new Error("Il modello non ha restituito alcun dato dalla ricevuta.");
  }

  let parsed: Partial<ReceiptExtraction>;
  try {
    parsed = JSON.parse(raw) as Partial<ReceiptExtraction>;
  } catch {
    throw new Error("Risposta del modello non in formato JSON valido.");
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
    name: String(parsed.name ?? "").trim(),
    amount: Number(parsed.amount ?? 0),
    currency: String(parsed.currency ?? "EUR").trim().toUpperCase(),
    billingCycle,
    nextRenewalDate,
    vatRate,
    amountIsGross,
    documentType,
  };
}
