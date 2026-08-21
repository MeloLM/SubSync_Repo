# 2026-08-21 — Pagine legali definitive (Privacy e Termini)

Sostituzione dei placeholder "Lorem ipsum" con i testi legali definitivi forniti
dal team, in preparazione alla schermata di consenso Google OAuth.

## File modificati

- **`app/(marketing)/privacy/page.tsx`**: informativa privacy completa in 5
  sezioni (dati raccolti, utilizzo, terze parti e IA, conservazione, diritti).
  Rimosso il commento `⚠️ PLACEHOLDER`. Testo inserito verbatim rispetto a quanto
  fornito; l'unico adattamento è tipografico (le voci elenco iniziano in minuscolo
  dopo l'etichetta in grassetto).
- **`app/(marketing)/terms/page.tsx`**: termini di servizio completi in 6 sezioni
  (descrizione, account, scanner IA, limitazione di responsabilità, modifiche,
  contatti). Rimosso il commento `⚠️ PLACEHOLDER`.

Entrambe mantengono `metadata` e struttura preesistenti e riusano il linguaggio
visivo già in uso nel route group marketing: `article` con `space-y-6`,
`h1 text-2xl`, `h2 text-lg font-semibold`, sezioni in `space-y-2`. Aggiunti
elenchi puntati (`ul.list-disc`) dove il testo li prevedeva e l'indirizzo email
come link `mailto:` colorato con il token `subsync-cyan`.

Gli apostrofi nei text node JSX sono resi con `&apos;` e le virgolette con
`&quot;`, come già fa il resto del codice (`global-error.tsx`,
`delete-subscription-button.tsx`): `react/no-unescaped-entities` di
`next/core-web-vitals` farebbe altrimenti fallire il lint.

## Documentazione

Nessun aggiornamento alle macro-aree. `docs/Architettura_NextJS.md` già descrive
le pagine legali come statiche e richieste dalla verifica OAuth: il contenuto
cambia, il concetto no. Per la Parte III di `AI_law_subsync.md` non c'è nulla da
riflettere nel grafo.

## Verifica

- `pnpm exec tsc --noEmit` — **exit 0**
- `pnpm exec next lint` — **exit 0**, nessun warning
- `pnpm exec next build` — **exit 0**, 16/16 route generate. `/privacy` e `/terms`
  risultano statiche (`○`), 159 B ciascuna

Non è stato eseguito `pnpm build` come da Parte IV: quello script include
`prisma migrate deploy`, che con `.env` volutamente vuoto (Parte VI) fallirebbe
per ragioni d'ambiente e non di codice. È la stessa ragione per cui la CI usa
`next build`. La copertura della verifica è equivalente, e superiore sul lint.

## Osservazione emersa

⚠️ **I testi legali descrivono solo l'accesso via Google OAuth, ma l'app supporta
anche email e password.** Termini, sezione 2: "L'accesso al servizio avviene
tramite provider di terze parti (Google OAuth)". Privacy, sezione 1: i dati di
autenticazione sono descritti solo per il caso Google.

Nel codice, `actions/auth.actions.ts` espone `signIn` e `signUp` con email e
password, e `components/forms/login-form.tsx` presenta il toggle accesso /
registrazione accanto al pulsante Google. La registrazione con credenziali è
quindi un percorso reale e attivo.

Non ho modificato il testo fornito: è materiale legale, la correzione è una
decisione del team. Se il percorso email/password resta attivo, entrambi i
documenti andrebbero integrati prima di sottoporli alla verifica Google.

## Stato

Working tree in attesa, **nessun commit effettuato** come richiesto: si attende
l'esito del test OCR in corso per un commit unico.
