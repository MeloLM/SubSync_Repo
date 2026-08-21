# 2026-08-03 18:29 (+0200) — Fix Scanner IA (OCR)

- **`next.config.mjs`**: `experimental.serverActions.bodySizeLimit = '4mb'` (rete
  di sicurezza per il payload immagine).
- **`actions/vision.actions.ts`**: `extractDataFromReceipt` ora ritorna un
  discriminated union `{ ok: true; data } | { ok: false; error }` invece di
  lanciare (i throw sono redatti in produzione). Chiamata Gemini in try/catch con
  `mapGeminiError` → messaggi chiari per 401 (chiave), 429 (rate limit), rete,
  blocco safety, JSON invalido, risposta vuota.
- **`components/forms/image-scanner.tsx`**: compressione client via `<canvas>`
  (lato lungo ~1400px, JPEG 0.7) prima dell'upload; `maxSize` 15 MB con messaggio
  dedicato; **anteprima thumbnail** con overlay di caricamento e tasto **Annulla**;
  gestione del nuovo output tipizzato; rimosso il commento obsoleto "mockata".
- **`components/subscriptions/subscription-scanner-form.tsx`**: avviso se la valuta
  rilevata ≠ EUR/USD (lasciata su EUR, da verificare).
- **`TODO.md`**: Sprint 4 Scanner allineato (modello `2.5-flash`, output completo,
  nota hardening S7).
- Verifica: `tsc --noEmit` + `next lint` + `next build` **Exit 0** (16/16 route,
  `next.config` accettato senza warning). In attesa di conferma per il commit.
- ⚠️ Config lato tuo: `GEMINI_API_KEY` su Vercel + accesso al modello
  `gemini-2.5-flash`.
