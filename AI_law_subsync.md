# AI_law_subsync — Sistema normativo di SubSync

Unico documento di riferimento per le regole operative, le direttive di
comportamento, le convenzioni di nomenclatura e la gestione della documentazione.

Nessun altro file contiene regole. `ARCHITECTURE.md` descrive **com'è fatto** il
progetto, `TODO.md` **a che punto è**, `docs/` **come funziona**: nessuno dei tre
prescrive comportamenti. Se una regola compare altrove, è un residuo da rimuovere:
questo file prevale sempre.

---

## Legge 0 — Lettura obbligatoria e integrale

**Prima di eseguire qualsiasi modifica al codice, leggi questo file per intero.**

Vale per ogni sessione e per ogni task, anche minimo, anche apparentemente
scollegato dall'architettura. Non è ammesso lavorare a memoria, su un estratto o
sulla base di ciò che il contesto sembra già contenere: le regole cambiano, e una
regola applicata nella versione sbagliata produce danni più silenziosi di una
regola ignorata.

La lettura precede la pianificazione, non la segue.

---

## Parte I — Regole architetturali vincolanti

Sono i pilastri su cui si fonda la correttezza dell'applicazione. Non sono
opzionali e non ammettono deroghe locali.

### Regola 1 — Calcoli monetari sempre in Decimal
È **obbligatorio** usare `Decimal.js` oppure `Prisma.Decimal` per **qualsiasi**
importo o calcolo monetario.

- **VIETATO** `number` / `float`: introduce errori di arrotondamento in virgola
  mobile (`0.1 + 0.2 !== 0.3`), inaccettabili in ambito finanziario.
- I campi monetari nello schema Prisma sono di tipo `Decimal`.
- Somme, divisioni (`annuale / 12`) e aggregazioni operano su istanze `Decimal`.
- Le ripartizioni distribuiscono il resto in centesimi: la somma delle quote deve
  tornare esatta.

### Regola 2 — Date di rinnovo normalizzate a 00:00:00 UTC
Ogni `nextRenewalDate` **deve** essere forzata a `00:00:00 UTC` **prima del
salvataggio**.

- Evita i bug di fuso orario (off-by-one day) fra client e server.
- La normalizzazione è centralizzata in `lib/date.ts` e va applicata in ogni
  Server Action di mutazione prima della scrittura.
- La formattazione per la UI avviene senza conversioni di fuso.

### Regola 3 — `revalidatePath` su ogni mutazione
Ogni Server Action che **muta** lo stato del database (create / update / delete)
**deve** chiamare `revalidatePath` sui path interessati.

Garantisce che la cache di Next.js rifletta lo stato reale del database subito
dopo la scrittura. Vale anche per le mutazioni innescate da route handler, cron
compreso.

### Regola 4 — Aggregazioni monetarie isolate sul server
Il calcolo del **Monthly Burn Rate**, dell'andamento di spesa e di ogni altra
metrica aggregata è confinato **esclusivamente** al server.

```
Monthly Burn Rate = Σ(costo abbonamenti mensili) + Σ(costo abbonamenti annuali) / 12
```

Il client **non** ricalcola né duplica la logica: riceve il valore già aggregato e
già formattato. Singola fonte di verità per i KPI, nessuna divergenza fra viste.

### Regola 5 — Architettura UI modulare
Ogni vista complessa va frammentata in micro-componenti (form, card, logica di
layout in file distinti dentro `components/`).

È **severamente vietato** creare file di pagina monolitici. L'obiettivo è
prevenire il sovraccarico cognitivo, umano e dell'IA, durante le modifiche alla UI.

### Regola 6 — Breakpoint vincolanti
I breakpoint standard di Tailwind sono **legge assoluta** per il layout.
Sono vietate deroghe che facciano affiancare la sidebar sotto la soglia desktop.

| Fascia | Soglia | Layout |
| ------ | ------ | ------ |
| Mobile | default, sotto 768px | Singola colonna, 100% width. **Nessuna sidebar affiancata**: la navigazione vive in un header superiore a comparsa |
| Tablet | `md:` 768–1024px | Layout di transizione |
| Desktop | `lg:` da 1024px | Due colonne: sidebar fissa + contenuto |

Conseguenza operativa: la sidebar esiste **solo** da `lg:` in su (`hidden lg:flex`);
sotto quella soglia la navigazione è esclusivamente nell'header mobile.

Il design si sviluppa mobile-first: si parte dal viewport stretto e si aggiungono
varianti, mai il contrario.

---

## Parte II — Regole 7 e 8: diario di bordo e report di esecuzione

Il lavoro va lasciato tracciabile due volte: nel repository, per chi lo leggerà fra
sei mesi (Regola 7), e nella risposta, per chi l'ha commissionato adesso
(Regola 8). Sono due destinatari diversi e nessuno dei due sostituisce l'altro.

### Regola 7 — Diario di bordo modulare

Al termine di **ogni** task o sessione, **prima di chiedere l'ok per il commit**,
è tassativo scrivere il diario di bordo.

#### Un file per task. Mai file cumulativi.

**È severamente vietato accodare log a un file cumulativo di sprint.**
Il pattern `sprint-N-changelog.md` è abolito: produceva un unico documento che
cresce senza limite, illeggibile, impossibile da consultare per task e destinato a
generare conflitti a ogni scrittura.

Ogni task completato produce **un nuovo file indipendente** in `.agent-logs/`:

```
.agent-logs/AAAA-MM-GG_slug-descrittivo.md
```

Esempi: `.agent-logs/2026-08-21_setup_grafo_obsidian.md`,
`.agent-logs/2026-08-22_fix-scanner-ocr.md`.

Lo slug è in minuscolo, descrittivo, separato da trattini o underscore. Se in una
stessa giornata si completano più task, ognuno ha il suo file: la data si ripete,
lo slug no. Un file già scritto non si modifica più.

#### Contenuto obbligatorio

Ogni file di log contiene:

- **Titolo e data** del task
- **File creati o modificati**, con la motivazione di ciascuno
- **Esito della verifica** (`tsc --noEmit` / `next build`), riportato fedelmente:
  se la verifica non è stata eseguita, va scritto che non è stata eseguita e perché
- **Note di configurazione**, se il lavoro richiede passi manuali fuori dal repo
  (Supabase, Vercel, variabili d'ambiente)
- **Osservazioni emerse**, se il lavoro ha rivelato problemi non richiesti

I log sono di sola documentazione: non entrano nel bundle Next.js.

**Nessun commit va richiesto senza aver prima scritto il file di log.**

---

### Regola 8 — Report di esecuzione

A ogni prompt strutturato — un task con azioni richieste, non una domanda di
chiarimento — la risposta si **chiude** con un Report di esecuzione. Non è un
riassunto di cortesia: è il documento con cui chi ha commissionato il lavoro
decide se fidarsi del risultato senza rileggere il diff.

#### Contenuto obbligatorio

Cinque voci, tutte presenti anche quando la risposta è "niente da segnalare".
Una voce omessa si legge come una voce negativa, e sarebbe una bugia per
omissione.

1. **Esito della validazione** — `tsc --noEmit`, lint e `vitest run`, ciascuno con
   il proprio esito e il numero di test. Riportato fedelmente: se qualcosa
   fallisce si scrive che fallisce e si mostra l'output. Se un comando non è stato
   eseguito, si dichiara quale e perché.
2. **Stato del working tree** — pulito o sporco, e se sporco, cosa resta fuori.
   Verificato con `git status`, non dedotto.
3. **Commit effettuati** — hash breve e messaggio di ciascuno, più l'esito del
   push. Se i commit sono più d'uno, va detto cosa sta in quale.
4. **Deviazioni dal piano** — ogni punto in cui l'implementazione si è discostata
   da quanto concordato, con la ragione tecnica. Comprese le deroghe alle regole di
   questo documento: una deroga si dichiara, non si nasconde. Se non ce ne sono, si
   scrive che non ce ne sono.
5. **Aggiornamento del log** — quale file di `.agent-logs/` è stato scritto
   (Regola 7), più le altre scritture documentali: macro-aree di `docs/`, `TODO.md`.

#### Cosa il report non è

Non è il posto per attenuare. Se una funzionalità è stata scritta ma non
collaudata, il report lo dice; se un test copre il caso felice e non gli estremi,
il report lo dice. La Parte IV ("Fedeltà del resoconto") vale qui integralmente:
**non dichiarare completato ciò che non è stato verificato.**

Non è nemmeno un sostituto del diario di bordo. Il log serve a chi leggerà il
repository fra sei mesi e resta immutabile; il report serve a chi legge adesso e
vive nella conversazione. Scrivere l'uno non esime dall'altro.

---

## Parte III — Documentazione e grafo Obsidian

Obsidian legge solo i file `.md` e costruisce il grafo dai link `[[Nome File]]`.
La documentazione è organizzata per **area logica**, non per file di codice.

### Macro-aree esistenti

Indicizzate in `docs/Index.md`, che è il nodo centrale del grafo:

| Nota | Copre |
| ---- | ----- |
| `Motore_Regole_NextJS` | Route group, confine server/client, cache e invalidazione, stati |
| `Auth_Utenti_e_Sessioni_Supabase` | Autenticazione, sessione, protezione rotte, sync utenti |
| `Database_Tabelle_e_Modelli_Prisma` | Schema, layer dati, DTO, regole su denaro e date |
| `Gestione_Pagamenti_e_Rinnovi` | CRUD, metriche, rinnovi automatici, pagamenti |
| `Condivisione_Spese_e_Gruppi` | Condivisione, inviti, quote, settlement |
| `Calcolo_IVA_e_Fisco` | Deducibilità, IVA, categorie di spesa |
| `Lettura_Scontrini_OCR_Gemini` | Estrazione dati da fattura via Gemini |
| `Soft_Delete_Abbonamenti` | Cessazione logica, filtri query, trend storico (progettato) |
| `Email_Ingestion_e_Matching` | Webhook email, parsing, matching, aggiornamento automatico (progettato) |
| `Interfaccia_Grafica_Dashboard` | Shell, famiglie di componenti, regole responsive |
| `App_Mobile_e_Offline_PWA` | Manifest, service worker, installabilità |

### VIETATO creare note per singolo componente

Un file `.md` per ogni file di codice è un errore già commesso e già corretto:
produce un grafo frammentato, illeggibile e impossibile da mantenere.

Quando crei o modifichi un file logico, individua la macro-area a cui appartiene e
**aggiorna quella nota**, descrivendo il flusso, la responsabilità o il modello che
cambia. Un nuovo file non merita un nodo nel grafo; un nuovo **concetto** sì.

Una nuova macro-area si crea solo per un'area logica davvero nuova, non coperta da
nessuna delle esistenti, e va agganciata a `docs/Index.md` e alla sezione
"Mappa Obsidian" di `ARCHITECTURE.md`.

### Struttura a cascata
Dentro ogni macro-area usa i titoli gerarchici (`##`, `###`) per descrivere flussi
di dati, modelli e responsabilità. Mappa le dipendenze **logiche** fra aree con i
link bidirezionali, non i singoli file fisici.

### Nodi fantasma
Una feature pianificata e non ancora esistente si cita con un link senza creare la
nota (es. `[[Email Webhook]]`): nel grafo appare come cerchio vuoto ed evidenzia
dove il lavoro si interrompe.

Quando la feature viene implementata, il ghost va **assorbito** nella macro-area
corrispondente e il link rimosso. Altrimenti il grafo si riempie di fantasmi già
realizzati e smette di dire il vero.

---

## Parte IV — Direttive operative

### Validazione
Al termine di ogni modifica **non** avviare `pnpm dev`. Esegui `pnpm build`.

Se la build fallisce, hai **due tentativi**. Al secondo fallimento fermati, non
insistere: scrivi l'errore in `TODO.md` sotto "Errors to fix" e riferisci.

### Report di chiusura
La forma del report è fissata dalla **Regola 8** (Parte II) e non si ripete qui:
due formulazioni della stessa regola sono peggio di nessuna regola.

Una sola aggiunta rispetto alle cinque voci obbligatorie: quando l'intervento
chiude una task di roadmap, indica anche la **prossima task logica in coda**.

### Fedeltà del resoconto
Se un test fallisce, dillo e mostra l'output. Se un passo è stato saltato, dillo.
Se qualcosa è completo e verificato, affermalo senza attenuazioni. Non dichiarare
completato ciò che non è stato verificato.

### Ambito
Consegna esattamente ciò che è stato chiesto. Se una parte del lavoro risulta
bloccata o problematica, completa tutto il resto e dichiara esplicitamente cosa è
rimasto fuori e perché: ridurre l'ambito è una decisione dell'utente, non tua.

---

## Parte V — Convenzioni di nomenclatura

### File di codice

| Categoria | Convenzione | Esempio |
| --------- | ----------- | ------- |
| Componenti | kebab-case, cartella per dominio | `components/split/member-row.tsx` |
| Server Action | kebab-case + suffisso `.actions.ts` | `actions/subscription.actions.ts` |
| Helper e librerie | kebab-case in `lib/` | `lib/date.ts` |
| Layer dati | in `lib/data/`, nome dell'entità al plurale | `lib/data/subscriptions.ts` |
| Test | accanto al file, suffisso `.test.ts` | `lib/money.test.ts` |
| Rotte | convenzioni App Router, route group fra parentesi | `app/(dashboard)/shared/page.tsx` |

Gli export sono in `camelCase` per funzioni e valori, `PascalCase` per componenti,
tipi e interfacce.

### Documentazione

| Categoria | Convenzione | Esempio |
| --------- | ----------- | ------- |
| Macro-aree | `Snake_Case` con iniziali maiuscole, in `docs/` | `docs/Database_Tabelle_e_Modelli_Prisma.md` |
| Indice | `docs/Index.md`, nome invariabile | |
| Log di sessione | `AAAA-MM-GG_slug-descrittivo.md` in `.agent-logs/` | `.agent-logs/2026-08-21_setup_grafo_obsidian.md` |

### Commit
Conventional Commits con descrizione in italiano e sprint di riferimento:

```
feat(invite): schermata /invite con QR Code, copia link e Web Share (Sprint 7)
fix(ocr): compressione immagine, ritorno tipizzato ed errori Gemini (Sprint 7)
docs(architecture): regola 7 changelog obbligatorio (Sprint 7)
```

Tipi in uso: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

---

## Parte VI — Vincoli di ambiente e build

Fatti del progetto che condizionano ogni esecuzione. Non sono preferenze.

### Variabili d'ambiente
- **`.env` è volutamente vuoto.** Contiene le chiavi `DATABASE_URL` e `DIRECT_URL`
  con valore stringa vuota: è un guardrail deliberato contro esecuzioni accidentali
  su database reale, non una dimenticanza. **Non riempirlo.**
- Le credenziali vere stanno **solo in `.env.local`** (URL Supabase, chiavi
  pubbliche, stringhe di connessione), che in Next.js ha precedenza.
- Prisma CLI e gli script Node caricano `.env`, **non** `.env.local`. Per eseguire
  un comando che tocca il database, i valori vanno iniettati nell'ambiente della
  singola invocazione leggendoli da `.env.local`, senza scriverli su disco né
  stamparli. Lo stato della shell non persiste fra chiamate, quindi svaniscono da
  soli.
- Le due connessioni hanno ruoli diversi: `DATABASE_URL` punta al transaction
  pooler (porta 6543, `pgbouncer=true`) per il runtime, `DIRECT_URL` al session
  pooler (porta 5432) per le migrazioni.
- Nessuno dei due file va committato.

### pnpm
`pnpm-workspace.yaml` contiene un elenco `allowBuilds`. Ogni dipendenza con uno
script `postinstall` **deve** comparire lì con valore `true`, altrimenti pnpm
solleva `ERR_PNPM_IGNORED_BUILDS` al primo install o build. Aggiungere una
dipendenza con install-script significa aggiornare quel file nella stessa modifica.

### Build e rilascio
- Lo script `build` di `package.json` esegue `prisma generate && prisma migrate
  deploy && next build`.
- `vercel.json` sovrascrive il comando di build con `prisma generate && next build`:
  **su Vercel `migrate deploy` non viene eseguito**. Le migrazioni di produzione
  sono un passo di rilascio separato e consapevole.
- La CI usa `next build`, non `pnpm build`, proprio per escludere `migrate deploy`
  dalle verifiche su pull request.
- Il cron dei rinnovi è dichiarato in `vercel.json` e protetto da bearer token.

### Testabilità
Le Server Action non sono testabili in isolamento: dipendono dai cookie di
sessione. I test coprono gli helper puri (denaro, date). Non promettere test su
codice che richiede una sessione autenticata senza aver prima predisposto i mock.

---

## Modifica di questo documento

Le regole si aggiornano **qui**, non altrove. Chi introduce una convenzione nuova
la scrive in questo file e rimuove ogni formulazione concorrente dagli altri
documenti. Due regole che dicono cose diverse sono peggio di nessuna regola.
