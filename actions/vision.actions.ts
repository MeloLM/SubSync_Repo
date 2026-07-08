"use server";

import { GoogleGenAI, Type } from "@google/genai";

import type { BillingCycle } from "@/lib/generated/prisma";

/**
 * Struttura dati estratta da uno scontrino/fattura dal modello Vision.
 * Mappa 1:1 sui campi editabili del form abbonamento (per l'auto-fill).
 */
export interface ReceiptExtraction {
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  /** Prossimo rinnovo in formato ISO 8601 "YYYY-MM-DD" (vuoto se non deducibile). */
  nextRenewalDate: string;
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
  },
  required: ["name", "amount", "currency", "billingCycle", "nextRenewalDate"],
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

  return {
    name: String(parsed.name ?? "").trim(),
    amount: Number(parsed.amount ?? 0),
    currency: String(parsed.currency ?? "EUR").trim().toUpperCase(),
    billingCycle,
    nextRenewalDate,
  };
}
