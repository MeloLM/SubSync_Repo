# 2026-08-03 18:25 (+0200) — Check-up generale + analisi OCR

- **Health check** (post-consolidamento Sprint 7): `tsc --noEmit` **Exit 0**,
  `next lint` **Exit 0** (nessun warning), `next build` **Exit 0** (16/16 route,
  middleware compilato). Nessun debito tecnico di compilazione.
- **Analisi Scanner IA (OCR)** — individuati due bug reali: (1) le immagini
  viaggiano come argomento base64 di una Server Action → superano il limite body
  di 1MB (default) con foto reali da smartphone; (2) gli errori sono `throw` →
  **redatti in produzione** da Next.js, il client non riceve messaggi utili.
  Più debito: commento "mockata" obsoleto in `image-scanner`, TODO Sprint 4
  disallineato (modello/output), valuta ≠ EUR/USD scartata in silenzio.
- **Decisione**: si passa al refactoring dell'OCR (compressione client + body
  limit 4mb + maxSize; ritorno tipizzato con mappatura errori Gemini; anteprima
  thumbnail + annulla; fallback valuta; pulizia doc).
