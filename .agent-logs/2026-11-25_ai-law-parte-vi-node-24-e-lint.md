# AI_law_subsync, Parte VI: Node 24 e lint con `eslint .` (Sprint 8) — 2026-11-25

Branch `chore/upgrade-next-16`. Decisione dell'utente, dalla proposta della fase 3 dell'upgrade.

## File modificati
- `AI_law_subsync.md`: nella Parte VI nuova sottosezione "Runtime e lint", prima di "pnpm". Dichiara Node 24 LTS (`engines.node` 24.x in `package.json`, stessa versione in CI) e il lint con `eslint .` al posto di `next lint`. Nessun'altra parte toccata, Parte IV compresa.

## Verifica
Modifica solo documentale: `tsc`, lint, test e build non eseguiti, perche' nessun file di codice e' cambiato. Controllato che `package.json` contenga `engines.node` `24.x`, che lo script `lint` sia `eslint .` e che la CI usi `node-version: 24`.

## Osservazioni
- La sezione "Build e rilascio" della Parte VI descrive ancora lo script `build` con `migrate deploy`: e' lo stato attuale. Cambiera' con la PR di backlog (script `build` senza migrazioni), annotata in `TODO.md`.
