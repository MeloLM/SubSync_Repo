# 2026-09-15 — Seed di dati finti per il collaudo visivo, e backlog del profilo

Strumento di sviluppo per riempire il database prima dello stress-test del grafico
a un anno.

## ⚠️ La cosa più importante di questo blocco

Il task chiedeva un solo cancello: bloccare l'azione se
`process.env.NODE_ENV !== "development"`. **Non basta, e in questo progetto è
pericoloso.**

Verificato prima di scrivere il codice: `.env.local` punta `DATABASE_URL` a
`aws-0-eu-west-3.pooler.supabase.com`, cioè il database **di produzione**. E
`next dev` carica `.env.local`. Quindi `NODE_ENV === "development"` è vero mentre
si è collegati ai dati veri: l'unico cancello richiesto sarebbe stato aperto
proprio nella situazione in cui il danno è irreversibile.

L'azione fa `deleteMany` fisico — non la disdetta logica, ma la cancellazione che
porta via `PaymentLog` e membri condivisi via cascade. Lanciarla per sbaglio
significa perdere lo storico reale dell'account.

Aggiunto quindi un secondo cancello che guarda **dove punta la connessione**, non
come gira Next. Se `DATABASE_URL` è su `localhost`/`127.0.0.1` non chiede niente;
se non lo è pretende `ALLOW_DEV_SEED=1`, con un messaggio d'errore che spiega cosa
fare (in `.env` ci sono già, commentate, le due righe per il Postgres di Docker).

Non ho toccato `AI_law_subsync.md`: l'avvertenza apparterrebbe alla Parte VI
("fatti che condizionano ogni esecuzione"), ma il task non lo chiedeva e il
documento normativo non si modifica di iniziativa. Voce aperta in `TODO.md`.

## ⚠️ Un'affermazione che avevo scritto ed era falsa

Primo tentativo: import statico di `SeedButton` nella pagina profilo, dentro un
ramo `process.env.NODE_ENV === "development"`, con il commento «in produzione
questo blocco è codice morto e non viene emesso».

**Falso.** La build di produzione portava `/profile` da 1,71 kB a 2,25 kB, e
cercando nel bundle:

```
grep -rl "Genera dati di test" .next/static
→ .next/static/chunks/app/(dashboard)/profile/page-*.js
```

La stringa del pulsante era nel chunk client di produzione. Il guard su `NODE_ENV`
impedisce il **rendering**, non il **bundling**: l'`import` statico di un Client
Component da un Server Component ne registra il riferimento a prescindere dal ramo
morto.

Corretto con un import condizionale dentro il ramo, così il bundler elimina
l'`import()` insieme al ramo che sa già falso:

```ts
const SeedButton =
  process.env.NODE_ENV === "development"
    ? (await import("@/components/dev/seed-button")).SeedButton
    : null;
```

Ricontrollato su build pulita: `/profile` torna a **1,71 kB**, esattamente la
dimensione precedente all'aggiunta dello strumento. Ora l'affermazione è vera.

## File creati

- **`actions/dev.actions.ts`** — `seedMockData()`. Due cancelli, upsert dell'utente
  per la FK, `deleteMany`, generazione, `revalidatePath("/", "layout")`.
- **`components/dev/seed-button.tsx`** — pulsante con conferma esplicita
  (`window.confirm`), `useTransition` e toast. La conferma non è teatro: l'azione è
  irreversibile, e il fatto che sia uno strumento di sviluppo non la rende meno tale.

## File modificati

- **`app/(dashboard)/profile/page.tsx`** — sezione "Strumenti di sviluppo" in fondo,
  con l'import condizionale sopra descritto.
- **`TODO.md`** — due nuove sezioni di backlog (vedi sotto).

## I dati del seed

Tredici abbonamenti, costruiti per far vedere qualcosa in **ogni** vista:

- **sette mensili** con giorni sparpagliati (3, 8, 12, 15, 20, 24, 28): danno la
  linea di base in tutti i mesi e riempiono la vista a 30 giorni, che con tre addebiti soli sarebbe stata poco interessante;
- **cinque annuali** distribuiti in modo che i picchi cadano sia nel futuro
  (+1 Adobe 763 €, +2 assicurazione 612 €, +5 Microsoft 365) sia nel passato
  (il rinnovo precedente di NordVPN cade 3 mesi fa, quello del dominio 2 mesi fa),
  così la finestra a un anno ha rilievi da entrambe le parti della linea "oggi";
- **uno disdetto** due mesi fa, perché la serie per competenza deve poter
  **scendere**: è il comportamento che il soft-delete è servito a garantire e
  merita di essere visibile;
- **uno con aumento di prezzo** a metà storico (Netflix 13,99 → 17,99), così la
  cassa passata mostra un gradino invece di una riga piatta.

Lo storico si genera camminando all'indietro dal prossimo rinnovo con una
`previousRenewal` locale che usa la stessa saturazione di `advanceRenewalDate`,
fermandosi a `createdAt` o alla data di disdetta.

Nessuna transazione interattiva: `DATABASE_URL` passa dal transaction pooler
(pgbouncer), con cui le transazioni interattive di Prisma non vanno d'accordo. Un
seed che fallisce a metà si rilancia — la prima cosa che fa è cancellare tutto.

## Backlog aggiunto

**Profilo e account.** Il selettore di valuta principale, con la precisazione che
oggi quel `<select>` è decorativo e che renderlo reale senza la conversione
sposterebbe il problema invece di risolverlo: un utente che sceglie USD vedrebbe la
stessa somma di valute miste con un altro simbolo davanti. E la dashboard
"Pagamenti mancati o scaduti", con l'osservazione che si incrocia con l'ingestione
email — una ricevuta che non arriva è essa stessa un segnale.

**Strumenti di sviluppo.** Il seed, e la voce aperta sull'avvertenza da
istituzionalizzare.

## Verifica

- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx vitest run` — **exit 0**, 73 test su 5 file (nessun test nuovo: l'azione
  dipende dai cookie di sessione e scrive sul database, fuori dalla portata di una
  suite di helper puri)
- `npx next build` — **exit 0**, `/profile` a **1,71 kB** su build pulita

⚠️ La build pulita emette un warning che le build incrementali nascondevano:
`@supabase/supabase-js` usa `process.version`, non supportato nell'Edge Runtime
dove gira il middleware. **Non è mio**: verificato eseguendo la build su HEAD con
le modifiche in stash, il warning compare identico. L'app è in produzione e il
middleware funziona, quindi è un avviso e non un guasto, ma vale la pena saperlo.

## Osservazione emersa

⚠️ **Il seed non è stato eseguito.** Non potevo: l'unico database raggiungibile da
qui è quello di produzione, ed eseguirlo avrebbe cancellato dati reali — cioè
esattamente ciò da cui il secondo cancello difende. Il codice è scritto, tipizzato
e compilato, ma **nessuna riga è mai stata scritta a database**. Il primo lancio
sarà anche il primo collaudo: vale la pena farlo contro il Postgres di Docker.

## Stato

Commit isolato dello strumento di sviluppo.
