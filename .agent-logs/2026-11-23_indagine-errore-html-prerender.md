# Indagine sull'errore `<Html>` nel prerender di `next build` — 2026-11-23

## Richiesta
`next build` falliva nel prerender (`<Html> should not be imported outside of
pages/_document`) su /login, /invite, /subscriptions/new, /privacy, /terms, /404,
/500, /_not-found.

## Esito dell'indagine
Nessuna modifica al codice: l'errore non è riproducibile sul codice attuale con un
ambiente pulito.

- Nessun import di `next/document` nel codice del progetto; nessuna cartella
  `pages/`, nessun `_document` o `_error`. App Router puro (`app/global-error.tsx`,
  `app/(dashboard)/error.tsx` sono componenti client normali).
- `next build` (NODE_ENV non impostato): compila, 16/16 pagine, exit 0, anche
  partendo da `.next` cancellato.
- `NODE_ENV=production next build`: compila, 16/16 pagine, exit 0.
- `NODE_ENV=development next build`: Next avvisa del valore non standard e il
  prerender fallisce (`Cannot read properties of null (reading 'useContext')` su
  /invite, /_not-found, /terms, /privacy). È la stessa famiglia di errori
  (build di produzione con React/Next in modalità sviluppo), con messaggio diverso
  da `<Html>`.

## Causa più probabile (ipotesi, non confermata sul posto)
Ambiente di build contaminato: `NODE_ENV` non standard ereditato dalla shell
oppure `.next` sporco di una precedente esecuzione in modalità dev. Con `.next`
ricreato da zero e NODE_ENV assente la build passa.

## File creati o modificati
- Questo log. Nessun altro file.

## Verifica
- `next build` da `.next` pulito: OK (16/16 pagine).
- `tsc --noEmit`: OK. `next lint`: nessun warning o errore.
- `vitest run`: 5 file, 73 test passati.
- `pnpm build` completo non eseguito di proposito (include `prisma migrate deploy`).

## Osservazioni emerse
- Node in uso: v25.0.0, non nella matrice supportata da Next 14.2: se l'errore
  ricompare, verificare con una LTS (20/22).
- Se ricompare: `rm -rf .next`, controllare `echo $NODE_ENV` e lanciare
  `env -u NODE_ENV npx next build`.
