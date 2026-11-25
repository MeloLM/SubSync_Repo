# Scanner Gemini: sessione obbligatoria e validazione del payload — 2026-11-25

## Richiesta
Intervento 3 dello Sprint 8. `extractDataFromReceipt` non verificava la sessione,
a differenza delle altre action sui dati, e chiama un'API a pagamento. Il payload
non era validato (il base64 nudo veniva assunto JPEG, il tipo dichiarato non era
controllato).

## File creati o modificati
- `actions/vision.actions.ts`: sessione obbligatoria tramite `getSessionUser` e
  `SESSION_EXPIRED_ERROR` di `lib/action-result.ts` (esito `{ ok: false, error }`,
  nessun throw); payload validato con `parseReceiptImage` prima di leggere la chiave
  e di chiamare Gemini. Rimosso `parseImagePayload`, sostituito dall'helper.
- `lib/validation/receipt.ts` (nuovo): helper puro. Solo data URL `image/jpeg`,
  `image/png`, `image/webp`; base64 ben formato; massimo 3 000 000 byte decodificati;
  firma dei primi byte coerente con il tipo dichiarato.
- `lib/validation/receipt.test.ts` (nuovo): 34 test (casi validi, input assente, tipi non
  ammessi, base64 malformato, tipo dichiarato non coerente con i byte, limite di
  dimensione, coerenza con `bodySizeLimit`).
- `docs/Lettura_Scontrini_OCR_Gemini.md`: flusso e nuova sezione sui controlli.
- `docs/Motore_Regole_NextJS.md`: una frase nella sezione sulla validazione.
- `TODO.md`: voce completata e voce aperta sul rate limit.

## Scelte e deviazioni dal brief
- **Limite di dimensione**: 3 MB decodificati = 4 000 000 caratteri base64, sotto i
  4 194 304 byte di `serverActions.bodySizeLimit: "4mb"` in `next.config.mjs` con
  margine per il prefisso e l'involucro della Server Action. `next.config.mjs` non è
  stato toccato.
- **Base64 nudo non più accettato**: prima era assunto JPEG. Il client manda sempre un
  data URL (canvas `toDataURL("image/jpeg")`), quindi nessun effetto sulla UI.
- **Controllo della firma dei byte**: non richiesto dal brief. Impedisce che testo o altro
  contenuto passi come immagine verso Gemini.
- Rate limit NON implementato, come da brief (due opzioni nel report).

## UI
`components/forms/image-scanner.tsx` gestisce già `{ ok: false }` (toast
«Scansione non riuscita» con `result.error`) e il `catch` per le eccezioni. Nessuna
modifica necessaria. Il testo della dropzone dice «PNG o JPG (max 15 MB)»: il limite
reale a valle è la compressione client (sempre JPEG, qualche centinaio di KB), quindi
non c'è conflitto; resta un'imprecisione di copy, non di comportamento.

## Verifica
Eseguita dopo tutte le modifiche (comprese docs e TODO) degli interventi 3 e 4:
- `npx tsc --noEmit`: nessun errore.
- `npx next lint`: nessun warning o errore.
- `npx vitest run`: 9 file, 290 test passati (231 + 34 di questo intervento + 25 del 4).
- `npx next build`: compilato.
- `pnpm build` NON eseguito, per deroga esplicita dell'utente alla Parte IV (include
  `prisma migrate deploy`).
- La Server Action non è testata in isolamento (dipende dai cookie di sessione): il
  ramo «sessione assente» non ha test automatici; sono coperti i soli helper.
- Nessuna prova manuale con una chiamata reale a Gemini.

## Note di configurazione
Nessuna.

## Osservazioni emerse
- Senza rate limit, un utente autenticato può comunque chiamare lo scanner senza tetto.
- Il copy della dropzone («max 15 MB») non coincide con i limiti reali a valle.
