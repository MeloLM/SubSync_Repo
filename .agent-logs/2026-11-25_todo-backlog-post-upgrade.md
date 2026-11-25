# TODO: backlog post-upgrade Next 16 (Sprint 8) — 2026-11-25

Branch `chore/upgrade-next-16`. Solo annotazioni, nessuna implementazione.

## File modificati
- `TODO.md`, Backlog consolidato, sezione "Strumenti di sviluppo": tre voci nuove.
  - PR piccola dopo il merge: `build` = `prisma generate && next build`, nuovo script per le migrazioni di produzione (per esempio `db:migrate:deploy`) come passo di rilascio consapevole, allineamento di `vercel.json`, CI, Parte IV e Parte VI, chiusura della voce sulle migrazioni nello script build. La voce preesistente «migrazioni tolte dallo script build» rimanda a questa.
  - Warning Turbopack sul client Prisma generato: da affrontare con l'aggiornamento di Prisma 5; intanto controllo della dimensione delle funzioni nel log di build di Vercel.
  - Rimisura delle dimensioni con Lighthouse mobile su `/login`, in produzione e sulla preview.
- `TODO.md`, sezione "Upgrade a Next 16 e React 19": le due voci su warning Prisma e confronto dimensioni ora rimandano al Backlog consolidato, per non avere due formulazioni della stessa cosa.

## Verifica
Modifica solo documentale: `tsc`, lint, test e build non eseguiti, perche' nessun file di codice e' cambiato.

## Osservazioni
- Fino alla PR di backlog, `pnpm build` esegue ancora `migrate deploy`: vale la deroga alla Parte IV gia' usata nelle fasi dell'upgrade (validazione con `next build`).
