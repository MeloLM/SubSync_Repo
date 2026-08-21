# 2026-08-21 — Schema: campo `canceledAt` e decisione sul fetcher

Primo intervento di codice dello Sprint 8: la cessazione logica entra nello
schema. Nessuna logica applicativa ancora modificata.

## Decisioni architetturali ricevute dal team

- **Fetcher unico.** Confermata la lettura senza filtro sul database: si estraggono
  tutti gli abbonamenti (attivi e cessati), memoizzati con `React.cache`, e il
  filtro sugli attivi avviene in memoria nel consumatore. Motivazione: SaaS
  personale, volume per utente irrisorio, e una sola query per render sulla
  dashboard vale più di un filtro spinto sul database. Registrato in
  [[Soft_Delete_Abbonamenti]] al posto dell'alternativa a due fetcher.
- **Matching email a punteggio con soglia** confermato per lo Sprint 8, obiettivo 2.
- Riferimento a `public/preview.png` rimosso dal README.

## File modificati

- **`README.md`** — rimossa la riga `![Dashboard Preview](/public/preview.png)`:
  il file non è mai esistito nel repository. Commit `aac7453`.
- **`prisma/schema.prisma`** — campo `canceledAt DateTime?` su `Subscription`,
  con commento sul significato (`null` = attivo) e sul vincolo di normalizzazione
  a 00:00:00 UTC (Regola 2). Nessun indice aggiunto: con il fetcher unico il
  filtro non arriva al database, quindi un indice su `canceledAt` non servirebbe.
- **`prisma/migrations/20260821131412_add_canceled_at/migration.sql`** — creata.

## Come è stata prodotta la migrazione

⚠️ **`prisma migrate dev` non è stato eseguito**, ed è la nota più importante di
questo log.

Il comando suggeriva di aggiornare "il database locale", ma un database locale
**non esiste**: Docker non è in esecuzione, niente è in ascolto su `5432`, e
`DATABASE_URL` / `DIRECT_URL` in `.env.local` puntano a **Supabase di
produzione**. `migrate dev` è un comando di sviluppo: crea uno shadow database e,
se rileva drift, propone il reset del database. Su produzione sarebbe stato
distruttivo.

Procedura effettivamente seguita, autorizzata dal team:

1. SQL generato **offline** con `prisma migrate diff` fra lo schema precedente e
   quello nuovo, senza contattare alcun database. Una sola istruzione:
   `ALTER TABLE "Subscription" ADD COLUMN "canceledAt" TIMESTAMP(3);`
2. `prisma migrate status` in sola lettura: le tre migrazioni precedenti
   risultavano già applicate, solo la nuova pendente.
3. `prisma migrate deploy` — applica le migrazioni pendenti, **non** usa shadow
   database e **non** propone mai reset.
4. `prisma migrate status` di conferma: *Database schema is up to date*.

Credenziali iniettate nell'ambiente della singola invocazione leggendole da
`.env.local`, senza scriverle su disco (Parte VI). `.env` resta vuoto.

I record esistenti hanno `canceledAt` a `NULL`, cioè attivi: nessun backfill
necessario.

## Verifica

- `prisma validate` — **valido** (con URL fittizi: `.env` vuoto blocca la CLI, come da guardrail)
- `prisma migrate status` — **Database schema is up to date**
- `pnpm exec tsc --noEmit` — **exit 0**
- `pnpm exec vitest run` — **exit 0**, 20 test su 3 file
- `pnpm exec next build` — **exit 0**

## Osservazioni emerse

- **`prisma generate` fallisce su Windows con `EPERM`** nel rename di
  `query_engine-windows.dll.node`: tre processi `node` attivi dalle 14:11 tengono
  il file bloccato. I tipi (`index.d.ts`, `index.js`) **sono stati rigenerati**
  correttamente e contengono `canceledAt`, e il binario del query engine non
  cambia perché la versione di Prisma è la stessa: typecheck, test e build
  passano. Ma ogni tentativo fallito lascia una copia `.tmp` da 19 MB: ne erano
  rimaste cinque, circa 96 MB, che ho rimosso. Vale la pena chiudere quei
  processi node prima del prossimo `generate`.
- **Il database di produzione ora ha una colonna che il codice non usa.** È una
  situazione sicura ma transitoria: la colonna è nullable e nessuna query la
  legge. Va chiusa nel prossimo blocco, altrimenti resta uno scarto fra schema e
  applicazione.
- `docker-compose.yml` è ancora nel repository e il README lo indica come passo
  di avvio, ma il progetto usa Supabase dallo Sprint 6. La procedura di avvio
  documentata non corrisponde più a come si lavora davvero.

## Stato

Migrazione applicata, working tree con schema e migrazione **non ancora
committati**: nessun commit richiesto per questo blocco oltre a quello del README.
Prossimo passo: fetcher unico in `lib/data/subscriptions.ts` e logica di calcolo
(filtro attivi in memoria per Burn Rate, lista, cron e Split; nessun filtro per
il trend, con condizione di appartenenza al mese estesa a intervallo).
