# Open redirect in /auth/callback — 2026-11-25

## Richiesta
Intervento 4 dello Sprint 8. In `app/auth/callback/route.ts` il parametro `next` era
concatenato a `origin` senza controlli: `next=@evil.com` produce
`https://<dominio>@evil.com`, cioè un redirect verso un host esterno dopo un login
riuscito.

## File creati o modificati
- `app/auth/callback/route.ts`: `next` passa per `safeRedirectPath`. Nessun'altra
  modifica al flusso (cookie, scambio del codice, redirect di errore invariati).
- `lib/validation/redirect.ts` (nuovo): helper puro. Accetta solo percorsi che iniziano
  con `/` e il cui secondo carattere non è `/` né `\`; rifiuta anche i caratteri di
  controllo (il browser li scarta dagli URL: `/<TAB>/evil.com` diventerebbe
  `//evil.com`). Ripiego su `/`.
- `lib/validation/redirect.test.ts` (nuovo): 25 test (percorsi validi con query e
  hash, `@evil.com`, `//evil.com`, `/\evil.com`, `///`, URL assoluti, `javascript:`,
  percorsi senza `/` iniziale, caratteri di controllo, stringa vuota, `null`,
  `undefined`, e verifica che l'URL risultante resti sull'origine).
- `docs/Auth_Utenti_e_Sessioni_Supabase.md`: paragrafo sul parametro `next` non fidato.
- `TODO.md`: nuova sezione «Open redirect su `/auth/callback`».

## Deviazioni dal brief
Il controllo sui caratteri di controllo è un'aggiunta non richiesta. Nessun'altra.

## Verifica
Eseguita dopo tutte le modifiche degli interventi 3 e 4: `npx tsc --noEmit` pulito,
`npx next lint` pulito, `npx vitest run` 290 test passati, `npx next build` compilato.
`pnpm build` NON eseguito (deroga dell'utente alla Parte IV).
Il route handler non è testato in isolamento (richiede Supabase e cookie): è coperto
solo l'helper. Nessuna prova manuale del login OAuth.

## Note di configurazione
Nessuna. Se un provider di login passasse un `next` con un percorso assoluto
legittimo, ora verrebbe riportato a `/`: oggi nessun punto del progetto imposta `next`.

## Osservazioni emerse
Nessuna oltre a quanto sopra.
