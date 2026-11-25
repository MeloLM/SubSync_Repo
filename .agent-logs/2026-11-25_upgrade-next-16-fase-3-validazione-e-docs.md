# Upgrade Next 16, fase 3: validazione da zero e documentazione (Sprint 8) — 2026-11-25

Branch `chore/upgrade-next-16`. Fase finale: validazione completa, misura delle
dimensioni, aggiornamento della documentazione. Nessun file di codice modificato.

## File modificati
- `README.md`: badge e stack (Next 16, React 19, ESLint 9 con `eslint .`), prerequisiti (Node 24 LTS, pnpm 11), comandi `lint` e `test`, riga sullo Sprint 8.
- `docs/Motore_Regole_NextJS.md`: nuova sezione "Versione: Next 16 e React 19" (API asincrone, `proxy.ts` con runtime Node, lint da CLI, regole React 19, warning noti); `proxy.ts` citato fra le rotte di sistema; `engines` nella configurazione.
- `docs/Auth_Utenti_e_Sessioni_Supabase.md`: "middleware" diventa "proxy" (sezione client e tabella di protezione delle rotte).
- `docs/Interfaccia_Grafica_Dashboard.md`: il vincolo su `ssr: false` non e' piu' legato a "Next 14".
- `ARCHITECTURE.md`: l'albero dei file mostra `proxy.ts` al posto di `middleware.ts`.
- `TODO.md`: nuova sezione "Upgrade a Next 16 e React 19" nello Sprint 8, con le voci chiuse e quelle aperte (collaudo manuale, PR, Node 24 locale, warning Prisma, rimisura dimensioni).
- `AI_law_subsync.md`: NON modificato.

## Validazione da zero
`.next` cancellata, `NODE_ENV` non impostato, Node locale v25.0.0 (pnpm avvisa: `engines` chiede 24.x).
- `npx tsc --noEmit`: pulito, exit 0.
- `pnpm run lint` (`eslint .`): pulito, exit 0.
- `npx vitest run`: 9 file, 290 test su 290.
- `npx next build` (Next 16.4.6, Turbopack): exit 0, 17 rotte, "Proxy (Middleware)" riconosciuto. Due warning Turbopack "Dynamic filesystem access causes tracing of the whole project" sul client Prisma generato, raggiunto dal cron dei rinnovi e dalla pagina abbonamenti.
- `grep -r "Genera dati di test" .next/static`: nessuna occorrenza (exit 1).
- `pnpm build` non eseguito: deroga dell'utente alla Parte IV (eseguirebbe `migrate deploy`).

## Dimensioni (indicative)
Confronto webpack (Next 14) contro Turbopack (Next 16), solo indicativo: i due bundler
spezzano i chunk in modo diverso. Baseline: gzip dei JS dell'entry di pagina da
`app-build-manifest.json`, che non include i layout. Dopo: gzip dei chunk di
`rootMainFiles` piu' layout e pagina dai `client-reference-manifest` (esclusi polyfill
nomodule, error, loading). Il "dopo" conta quindi piu' file del "prima".
Script: `measure.mjs` (baseline) e `measure16.mjs` (dopo), nel scratchpad della sessione.

| Rotta | Prima (KB gzip) | Dopo (KB gzip) |
| --- | --- | --- |
| base condivisa (`/_not-found` prima, rootMain dopo) | 86,4 | 128,9 |
| root layout / dashboard layout | 96,3 / 100,4 | 128,9 / 137,6 |
| `/login` | 111,4 | 153,6 |
| `/` | 86,9 | 153,6 |
| `/subscriptions` | 105,1 | 153,0 |
| `/subscriptions/new` | 124,1 | 172,0 |
| `/subscriptions/[id]/edit` | 105,7 | 153,5 |
| `/subscriptions/[id]/split` | 106,3 | 154,2 |
| `/payments` | 85,7 | 151,6 |
| `/shared` | 96,3 | 152,6 |
| `/profile` | 96,6 | 153,1 |
| `/invite` | 102,0 | 158,6 |
| `/privacy`, `/terms` | 85,7 | 151,1 |

Lettura: la base condivisa cresce di circa 40 KB gzip (React 19 e client Next 16),
e tutte le rotte la ereditano. Il costo specifico di ogni pagina sopra la base e'
dello stesso ordine di prima. Il polyfill nomodule (38,7 KB) e' escluso dal "dopo".
Totale chunk in `.next/static`: circa 342 KB gzip. Da rimisurare con un'unica
metodologia dopo il deploy.

## Run interrotto delle 16:09 UTC (perche' voleva toccare `.env.local`)
Il file indicato (`tasks/a5ddbf5bad944b4a5.output`) e' vuoto (0 byte). La cronologia
reale e' nel transcript dell'agente con lo stesso identificativo, nella cartella dei
subagent della sessione: letta solo con ricerche mirate, senza riportare valori.
Esito: l'agente (EFESTO, "Migrate deploy, query e backlog") **non voleva modificare**
`.env.local`. Lo leggeva soltanto, per iniettare le due stringhe di connessione nella
singola invocazione di uno script di verifica di sola lettura sullo schema, come
previsto dalla Parte VI. Nella stessa riga c'era anche un `sed -i` sul suo script
temporaneo nello scratchpad: il guardiano ha classificato il comando come
"esecuzione indiretta con comando distruttivo" su `.env.local` e lo ha bloccato.
Nessuna scrittura su `.env.local` e' mai avvenuta (nessuna Edit o Write su quel file
nella cronologia). `.env.local` e' ignorato da git e non e'
stato toccato in questa fase.

## Proposta (non applicata) per `AI_law_subsync.md`
Nessuna regola cita `next lint`, `middleware` o versioni di Next: il file e' ancora
corretto. Facoltativo, Parte VI: aggiungere una riga "Node 24 LTS (`engines`), lint con
`eslint .`", e valutare se la Parte IV debba prevedere un'alternativa a `pnpm build`
(che esegue `migrate deploy`) quando serve solo validare la compilazione.

## Osservazioni
- Il polyfill nomodule pesa 38,7 KB gzip ma non e' caricato dai browser moderni.
- Il run delle 16:09 aveva applicato la migrazione `email_ingestion_schema` su Supabase
  (vedi TODO); non e' parte di questo branch.
