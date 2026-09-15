# 🗺️ Roadmap — SubSync

| Metadato         | Valore |
| ---------------- | ------ |
| **Last Updated** | 2026-09-15 |
| **Sprint attivo** | 🔴 **SPRINT 8 — Integrità dello Storico & Aggiornamento Automatico** |
| **Status**       | App **LIVE e stabile su Vercel**. Sprint 1, 2, 6 e 7 completati. Sprint 3, 4 e 5 chiusi sul consegnato, con i residui spostati nel **Backlog consolidato** in fondo. Il focus passa dall'interfaccia ai dati: prima la cessazione logica degli abbonamenti (senza cui lo storico del trend è inattendibile), poi l'ingestione email che tiene prezzi e rinnovi aggiornati da soli. |
| **Goal**         | Tracciare gli abbonamenti e calcolare il **Monthly Burn Rate** normalizzato, con importi monetari accurati (Decimal) e date timezone-safe (00:00:00 UTC). |
| **Pipeline**     | Sprint a granularità fine — micro-cicli specializzati per prevenire il degrado del contesto. Un solo Sprint attivo alla volta. |

> **Direttiva per l'agente:** questo file è la fonte di verità sullo stato di
> avanzamento. Ogni volta che una funzionalità viene completata, la relativa
> task va spuntata (`- [x]`) autonomamente, aggiornando anche **Last Updated** e
> **Status**. Uno Sprint è concluso solo quando **tutte** le sue sotto-task sono
> spuntate, oppure quando i residui vengono spostati nel Backlog con motivazione.
> Le regole operative stanno in `AI_law_subsync.md`, non qui.

---

## 🔴 SPRINT 8 — Integrità dello Storico & Aggiornamento Automatico `[ATTIVO]`

> 🔴 Obiettivi in sequenza, non in parallelo. Il soft-delete è una precondizione
> dell'ingestione email: il matching delle ricevute deve poter distinguere un
> abbonamento attivo da uno cessato. Il grafico dinamico si è inserito fra i due
> perché ha fatto emergere un bug di fatturazione sulle date di rinnovo, che
> l'ingestione avrebbe ereditato.

### 1️⃣ Soft-Delete abbonamenti 🔴 → [[Soft_Delete_Abbonamenti]]

_Priorità assoluta. Finché la disdetta cancella il record, il grafico del trend
racconta una storia falsa: non mostra la spesa che scende, mostra un passato
riscritto._

- [x] ⚠️ Schema Prisma — campo `canceledAt DateTime?` su `Subscription` (`null` = attivo)
- [x] Migrazione additiva `20260821131412_add_canceled_at` — applicata su Supabase con `migrate deploy` (non `migrate dev`: non esiste un DB locale)
- [x] ⚠️ `canceledAt` normalizzata a **00:00:00 UTC** pre-salvataggio (Regola 2)
- [x] Fetcher **unico** senza filtro + `lib/subscription-status.ts` come unico punto del filtro (`isActive`, `onlyActive`, `wasActiveInPeriod`) → [[Database_Tabelle_e_Modelli_Prisma]]
- [x] Filtro attivi applicato a lista, Burn Rate, cron rinnovi e inviti Split-Billing
- [x] Trend di spesa: **nessun filtro**, appartenenza al mese estesa a intervallo via `wasActiveInPeriod`
- [x] Test: 5 sul trend con cessazione + 10 su `subscription-status` (35 test totali verdi)
- [x] `deleteSubscription` → `cancelSubscription`; componente rinominato `cancel-subscription-button`, dialog riformulato → [[Interfaccia_Grafica_Dashboard]]
- [ ] ⚠️ **UI di riattivazione**: `reactivateSubscription` esiste ma nessuna schermata la invoca — un abbonamento disattivato non è più raggiungibile → [[Interfaccia_Grafica_Dashboard]]
- [x] ♻️ `revalidatePath` su disattivazione e riattivazione (Regola 3)
- [ ] Decisione di prodotto: se servi anche una cancellazione definitiva per i record inseriti per errore

### 2️⃣ Grafico dinamico e proiezione di cassa 🔴 → [[Gestione_Pagamenti_e_Rinnovi]]

_Il grafico normalizzato risponde a "quanto mi costa in media al mese", non a "in
quali mesi spenderò di più": la normalizzazione nasconde proprio i picchi che
servono a pianificare. Da qui la seconda metrica, e il bug di fatturazione che
progettarla ha fatto emergere._

- [x] ⚠️ **Fix clamping date**: `advanceRenewalDate` faceva traboccare il giorno nel mese successivo — il 31 gennaio finiva al 3 marzo e **febbraio spariva**. Ora satura all'ultimo giorno del mese (Regola 2 invariata) → [[Database_Tabelle_e_Modelli_Prisma]]
- [x] Scheletro temporale condiviso `buildMonthBuckets` in `lib/date.ts`: finestre passate, future o a cavallo del presente, usate da entrambe le metriche
- [x] ⚠️ `lib/cash-flow.ts` — enumerazione dei rinnovi, proiezione a importi **pieni**, storico dai `PaymentLog` reali, vista giornaliera a 30 giorni (tutto in `Decimal`)
- [x] Proiezione iterata sulla **stessa** funzione del cron: il grafico non può promettere una data che il cron non rispetterà
- [x] Confine consolidato/proiettato alla mezzanotte di domani: nessun doppio conteggio col `PaymentLog` del giorno
- [x] Test: 36 nuovi, incluso l'**invariante Σ cassa === Σ competenza === Burn Rate × 12** (71 totali verdi)
- [x] Fetcher `getPaymentsByUserInRange`: il taglio della finestra lo fa il database → [[Database_Tabelle_e_Modelli_Prisma]]
- [x] Tutte le serie precalcolate in una sola lettura (Regola 4): cambiare vista non è un round-trip
- [x] UI: due selettori segmentati indipendenti, mobile-first, estratti in un componente proprio (Regola 5) → [[Interfaccia_Grafica_Dashboard]]
- [x] BarChart con opacità differenziata e `ReferenceLine` "oggi"; nessun `ComposedChart`
- [x] Collaudo visivo: superato sui calcoli, ha prodotto tre rilievi di UX, tutti chiusi sotto
- [ ] ⚠️ **Deriva residua di ancoraggio**: dopo un passaggio da un mese corto il 31 diventa 28 e non torna indietro. Serve un campo `anchorDay` sullo schema → [[Database_Tabelle_e_Modelli_Prisma]]

#### Rifinitura UX del grafico (dal collaudo visivo)

- [x] **Asse X continuo** nella vista a 30 giorni: la serie contiene tutti i giorni, a zero dove non cade nulla. Prima erano tre colonne accostate e la distanza fra un addebito e l'altro spariva
- [x] **Testi in lingua utente**: "Spesa media" / "Addebiti reali" al posto di competenza e cassa, "30 giorni / 6 mesi / 1 anno" al posto di 1M / 6M / 1A, didascalie riscritte come domande
- [x] **Selezione interattiva** delle barre con somma dinamica nel footer, contatore e pulsante di azzeramento; la selezione si azzera al cambio di vista → [[Interfaccia_Grafica_Dashboard]]
- [x] ⚠️ Somma della selezione in **centesimi interi**, non in virgola mobile: unica aggregazione monetaria sul client, deroga consapevole alla Regola 4 ma non alla Regola 1
- [x] Parità da tastiera: pulsanti per punto, visibili al focus, perché le barre SVG non sono raggiungibili con Tab
- [ ] Collaudo visivo della rifinitura: 30 barre su viewport stretto, leggibilità delle etichette dell'asse X, comportamento dei pulsanti di selezione al focus

#### Debiti di UX smarcati fuori obiettivo

- [x] **Banner PWA**: il rifiuto è ricordato per 30 giorni in `localStorage` (istante di scadenza, non flag), letto in `useEffect` per non produrre hydration mismatch e protetto da `try/catch`. Vale come rifiuto anche il "no" alla finestra nativa → [[App_Mobile_e_Offline_PWA]]
- [x] **Profilo**: form del nome visualizzato su `user_metadata.full_name`, via Server Action con `revalidatePath` (Regola 3) e toast Sonner → [[Auth_Utenti_e_Sessioni_Supabase]]
- [x] **Regola 8** istituzionalizzata in `AI_law_subsync.md`: report di esecuzione obbligatorio a ogni prompt strutturato
- [ ] Collaudo in browser del banner PWA: serve una build di produzione in HTTPS, `beforeinstallprompt` non si attiva in sviluppo
- [x] La **barra laterale mostra il nome**: invalidazione portata a `revalidatePath("/", "layout")` **e** layout aggiornato per leggere `full_name`, perché la cache da sola ri-renderizzava lo stesso markup → [[Auth_Utenti_e_Sessioni_Supabase]]

### 3️⃣ Email Ingestion & Payment Matcher 🟡 → [[Email_Ingestion_e_Matching]]

_La killer feature: le ricevute arrivano già per email a ogni rinnovo.
Intercettarle rende il Burn Rate un dato vivo invece di una fotografia del
giorno dell'inserimento._

- [x] ⚠️ **Decisioni di modello chiuse** — i tre nodi risolti in [[Email_Ingestion_e_Matching]], con schema Prisma progettato ma **non applicato**:
  - **Identità**: indirizzo di ricezione univoco per utente (token casuale da 128 bit, ruotabile), non matching sul mittente — che si rompe sull'inoltro automatico ed è falsificabile
  - **Idempotenza**: `Message-ID` normalizzato, con hash del contenuto come ripiego; vincolo `@@unique([userId, dedupeKey])` sul **database**, non un controllo applicativo
  - **Stato di attesa**: entità `PaymentProposal` separata, **nessuno `status` su `PaymentLog`** — sarebbe lo stesso errore del filtro dimenticato che il soft-delete ha insegnato a evitare
- [x] **Ambito ristretto alle sole email transazionali** (ricevute e fatture di rinnovo): è ciò che rende il parsing risolvibile e il dominio mittente un segnale forte
- [ ] 🔐 Endpoint **webhook** di ricezione, autenticato con segreto condiviso e con limite di payload
- [ ] 🔐 Generazione, rotazione e rate limit del token di ricezione su `User` → [[Auth_Utenti_e_Sessioni_Supabase]]
- [x] **Schema Prisma**: `InboundEmail`, `PaymentProposal`, `inboundToken` su `User`, `source` su `PaymentLog` e cinque nuovi enum. `prisma validate` e `generate` verdi → [[Database_Tabelle_e_Modelli_Prisma]]
- [ ] ⚠️ **Migrazione non generata**: richiede `DIRECT_URL`, non disponibile in locale per scelta. Passo di rilascio consapevole, da eseguire contro Supabase
- [ ] 🔐 Scelta del provider inbound — **raccomandato Postmark** (JSON nativo, `MailboxHash`, `Headers` completo): da approvare e verificare sul campo
- [ ] ⚠️ **Identità dal destinatario di busta, non da `To`**: l'inoltro automatico conserva il destinatario originale, quindi il token non compare in `To`. Vincolo sulla scelta del provider, non un dettaglio
- [ ] Indirizzi nella forma `receipts+<token>@in.subsync.app` per allinearsi a `MailboxHash`, se si conferma Postmark
- [ ] DNS del dominio di ricezione: MX, SPF, DMARC su `in.subsync.app`
- [ ] ⚠️ **Collisione cron ↔ ingestione**: entrambi scrivono `PaymentLog` per lo stesso ciclo. L'evidenza corregge la previsione, non ne aggiunge una seconda
- [ ] Parsing di nome, importo, valuta e data — riuso del contratto di estrazione già in uso per lo scanner → [[Lettura_Scontrini_OCR_Gemini]]
- [ ] ⚠️ Importi in `Decimal`, date a 00:00:00 UTC prima di toccare il DB (Regole 1 e 2)
- [ ] **Matching a punteggio con soglia** (nome normalizzato + importo + prossimità al rinnovo atteso), solo fra abbonamenti attivi
- [ ] **Ogni ricevuta genera una proposta `PENDING`**: nessuna scrittura d'autorità su `PaymentLog`, a nessun punteggio. Il punteggio ordina le proposte, non autorizza
- [ ] Schermata di approvazione: variazione di prezzo in chiaro ("12,99 → 15,99 €") e segnali che hanno prodotto il punteggio → [[Interfaccia_Grafica_Dashboard]]
- [ ] Approvazione in **una sola transazione**: `PaymentLog` + prezzo + `nextRenewalDate` + ♻️ `revalidatePath`
- [ ] Mitigazioni contro l'affaticamento da conferme: approvazione in blocco e fiducia per abbonamento, entrambe **sopra** il comportamento conservativo, mai al posto suo
- [ ] Notifica all'utente quando un prezzo cambia: un aumento non deve restare silenzioso a sua volta

---

## ✅ SPRINT 1 — Core SaaS Infrastructure `[COMPLETATO]`

> 🔴 Fondazione tecnica: scaffolding, persistenza e logica di business server-side.

### Setup infrastruttura
- [x] Init progetto Next.js 14 (App Router, TypeScript) — pnpm formalizzato (`packageManager`)
- [x] Tailwind CSS + Lucide React configurati
- [x] Dipendenze installate: Prisma, `@supabase/ssr` + `@supabase/supabase-js`, `decimal.js`, `date-fns`
- [x] 🔐 Supabase SSR — client `lib/supabase/server.ts` + `lib/supabase/client.ts` (sessione via cookie)
- [x] Utility: `lib/date.ts` (forza 00:00:00 UTC) + DTO `types/index.ts` (Decimal/Date → `string`)
- [x] Setup Docker + PostgreSQL — container `subsync_db` healthy su `:5432`

### Database relazionale
- [x] Setup Prisma ORM e connessione al DB (singleton `lib/prisma.ts`)
- [x] Schema Prisma — `User`, `Subscription`, `PaymentLog`
  - [x] Relazione `User (1) → (N) Subscription (1) → (N) PaymentLog` con `onDelete: Cascade`
  - [x] ⚠️ `amount` tipizzato `Decimal`; `billingCycle` enum (`MONTHLY`/`YEARLY`)
- [x] Migrazione del database — `20260624170045_init` applicata; DB in sync

### Server Actions
- [x] 🔐 Binding sessione → record: `userId` Supabase legato a ogni record (`getCurrentUser` + upsert `User`)
- [x] CRUD Abbonamenti via Server Actions (`actions/subscription.actions.ts`) — auth Supabase + ritorno via DTO
  - [x] ⚠️ Calcoli monetari con **Decimal**
  - [x] ⚠️ `nextRenewalDate` forzata a **00:00:00 UTC** pre-salvataggio
  - [x] ♻️ Ogni mutazione chiama `revalidatePath`
- [x] Aggregazione **Monthly Burn Rate** server-only (`actions/burn-rate.actions.ts`) → `BurnRateDTO`

---

## ✅ SPRINT 2 — App Shell, Auth & CRUD UI `[COMPLETATO]`

> 🔴 L'applicazione diventa usabile end-to-end: login reale, dati reali, stati gestiti.

### 🔐 Autenticazione (Login UI Supabase)
- [x] UI Login/Signup email-password — `app/(auth)/login/page.tsx` (pagina unica con toggle) + `actions/auth.actions.ts`
- [x] Integrazione credenziali Supabase reali (`.env.local` → URL + publishable key) — verificata su :3001
- [x] `middleware.ts` per protezione route `(dashboard)` + refresh cookie di sessione
- [x] Redirect utente non autenticato → `/login` (verificato: `/`, `/subscriptions` → 307) e post-login → `/`
- [x] Route handler `/auth/callback` (conferma email / OAuth) + logout (`signOut`) nel profilo

### CRUD UI (sostituzione dati mock → Server Actions reali)
- [x] Lista `/subscriptions` collegata a `listSubscriptions()` (async, `force-dynamic`)
- [x] Dashboard KPI collegata a `getMonthlyBurnRate()` + prossimi rinnovi reali (rimosso il mock)
- [x] Timeline `/payments` collegata ai `PaymentLog` reali (`listPayments` + nome servizio)
- [x] Form **modifica** abbonamento (`/subscriptions/[id]/edit`) → `updateSubscription`
- [x] Azione **elimina** con dialog di conferma → `deleteSubscription`
- [x] Profilo `/profile` collegato alla sessione Supabase reale (+ sidebar con utente reale)

### Gestione microscopica degli stati
- [x] ⚠️ **Error Boundaries** — `error.tsx` per route group `(dashboard)` + `global-error.tsx`
- [x] **Skeleton Loaders** — `loading.tsx` (dashboard/abbonamenti/pagamenti) + primitive `components/ui/skeleton.tsx` _(`<Suspense>` granulare sulle metriche al wiring dei dati reali)_
- [x] **Toast Notifications** via **Sonner** — `<Toaster>` nel root layout + feedback su create/errori action _(update/delete al rispettivo wiring CRUD)_
- [x] **Empty states** dedicati (`components/ui/empty-state.tsx` su abbonamenti / pagamenti)
- [x] Validazione form lato client (HTML5) + mapping errori delle Server Actions → toast

---

## 🟢 SPRINT 3 — PWA & Mobile Optimization `[CHIUSO SUL CONSEGNATO]`

> 🟡 Da web app a prodotto installabile, fruibile e resiliente in mobilità.

### Installabilità
- [x] `app/manifest.ts` — `name`, `short_name`, `theme_color`, `display: standalone` (→ `/manifest.webmanifest`)
- [x] Iconografia — `192x192`, `512x512` + `512` **maskable** (PNG reali in `public/`)
- [x] `apple-touch-icon` (180) + meta `apple-mobile-web-app-*` _(startup image iOS dedicate: rinviate)_
- [x] Schermata di invito con **QR Code** per il download rapido della PWA tramite link condiviso — rotta `/invite` (`qrcode.react`, copia link + Web Share)

### Offline & Service Worker
- [x] **Service Worker** (`public/sw.js`) — cache-first su asset statici (`/_next/static` + icone)
- [x] **Offline fallback** — `public/offline.html` + navigations network-first con fallback
- [ ] Strategia di cache per le viste read-only del Burn Rate — _spostata nel **Backlog consolidato**_ → [[Burn Rate Offline Cache]]

### Meta & UX mobile
- [x] Meta tag **iOS/Android** (`apple-mobile-web-app-*`, `theme-color`, `viewport-fit=cover`)
- [x] Componente **Install Prompt** (A2HS) — banner dedicato su `beforeinstallprompt`
- [ ] Lighthouse PWA 90+ — _spostata nel **Backlog consolidato**_ → [[Lighthouse Audit]]

---

## ✅ SPRINT 4 — Asynchronous Automations `[CHIUSO SUL CONSEGNATO]`

> 🟡 Automazioni che eliminano l'inserimento manuale e tengono i dati sempre freschi.
>
> 📥 L'**Email Ingestion** originariamente prevista qui è stata promossa a
> obiettivo di primo piano: vedi **Sprint 8**.

### ⏰ Cron Job rinnovi
- [x] Endpoint locale di test `/api/cron/renewals` (route handler) — testato (401/200)
- [x] 🔐 Protezione endpoint con `CRON_SECRET` (header `Authorization: Bearer`)
- [x] Configurazione **Vercel Cron** (`vercel.json`, schedule giornaliero `0 6 * * *`)
- [x] ⚠️ Avanzamento `nextRenewalDate` a rinnovo avvenuto (sempre 00:00:00 UTC, `advanceRenewalDate`)
- [x] Creazione `PaymentLog` automatica al rinnovo + ♻️ `revalidatePath`
- [x] Idempotenza (no doppi log sullo stesso ciclo) — verificata su DB reale

### 👁️ AI Receipt Scanner (Vision API) `[COMPLETATO]`
- [x] Integrazione UI: Dropzone (`react-dropzone`) nel form `/subscriptions/new` — componente `image-scanner` + wrapper `subscription-scanner-form`.
- [x] Server Action: `actions/vision.actions.ts` — SDK ufficiale **Google Gemini** (`@google/genai`, modello `gemini-2.5-flash`), immagine via `inlineData`; chiave da `GEMINI_API_KEY`.
- [x] Prompt Engineering: `systemInstruction` + output vincolato con `responseMimeType: application/json` e `responseSchema` (JSON Schema rigoroso) → `{ name, amount, currency, billingCycle, nextRenewalDate, vatRate, amountIsGross, documentType }`.
- [x] Auto-fill: JSON cablato ai campi del form via handle imperativo (`setValue`-like su form controllato); toast "Fattura analizzata! Controlla i dati prima di salvare."

---

## 🟢 SPRINT 5 — Enterprise & B2B Features `[CHIUSO SUL CONSEGNATO]`

> 🟢 Feature ad alto valore aggiunto che differenziano il prodotto (post-MVP).

### Split-Billing `[COMPLETATO]`
- [x] Modello dati condivisione spese tra utenti (quote/membri) — `SubscriptionMember` (account reali + inviti via email, enum `InviteStatus`, `shareWeight` Decimal, settlement)
- [x] Algoritmo di ripartizione importi — ⚠️ `splitByWeights` interamente in **Decimal**, somma esatta col resto in centesimi (metodo del resto maggiore); proprietario implicito a peso 1 (`lib/split.ts`)
- [x] Vista "chi deve cosa" + stato di settlement — proprietario: `/subscriptions/[id]/split`; invitato: `/shared` (inviti accetta/rifiuta + condivisi con me) + badge inviti in sidebar
- _Nota: il Monthly Burn Rate resta sul costo degli abbonamenti posseduti (Regola 4 invariata in questo pass)._

### Fiscalità & Ottimizzazione
_Residui spostati nel **Backlog consolidato**: il motore di calcolo fiscale esiste
in `lib/fiscal.ts` ma non è collegato a nulla, e le due ottimizzazioni sono
progetti a sé. Vedi [[Calcolo_IVA_e_Fisco]]._

---

## ✅ SPRINT 6 — DevOps, Testing & Deploy `[COMPLETATO]`

> 🟢 Industrializzazione: qualità automatizzata e go-live in produzione.

### CI / Qualità `[COMPLETATO]`
- [x] **GitHub Actions** — pipeline `lint` + `typecheck` + `test` + build su PR/push (`.github/workflows/ci.yml`)
- [x] Step `prisma validate` + build in CI — usa `next build` (non `pnpm build`) per escludere `migrate deploy`, che è uno step di RILASCIO su Vercel
- [x] Setup test (**Vitest**) sugli helper critici — `money` (splitByWeights, esattezza Decimal, formatMoney) + `date` (UTC, advanceRenewalDate): 12 test verdi. _Burn Rate: aritmetica pura (Decimal + /12) coperta dai test money; il test dell'action completa è rinviato (richiede mock di Prisma/auth)._

### Deploy `[COMPLETATO]`
- [x] Configurazione **variabili d'ambiente di produzione** (DB, Supabase, `CRON_SECRET`) — allineate su Vercel; risolto il bug del Server Component "Supabase non configurato" (env `NEXT_PUBLIC_SUPABASE_*` mancanti a build-time)
- [x] **Vercel Deployment configuration** (`vercel.json`, build & env)
- [x] `prisma migrate deploy` nel flusso di rilascio — nello script `build` (gira su Vercel prima di `next build`, via `DIRECT_URL`); DB Supabase collegato e in sync
- [x] Smoke test post-deploy — app **live e stabile**: login/autenticazione OK, DB connesso, sessioni SSR funzionanti _(monitoraggio errori in continuo)_

---

## ✅ SPRINT 7 — Architettura Modulare, Legale & Sistema Documentale `[COMPLETATO]`

> 🔴 Sprint di consolidamento: hardening dello scanner, pagine legali definitive,
> grafico del trend riscritto e riordino completo di regole e documentazione.
> I residui di refactoring UI sono stati spostati nel **Backlog consolidato**:
> non bloccano il lavoro sui dati e verranno ripresi dopo lo Sprint 8.

### Scanner IA — hardening
- [x] Compressione immagine client-side (`<canvas>`) + `serverActions.bodySizeLimit` 4mb + `maxSize` sulla dropzone
- [x] Ritorno tipizzato `{ ok, data | error }` con mappatura degli errori Gemini (401 / 429 / rete / safety / JSON invalido)
- [x] Anteprima thumbnail con annulla + avviso su valuta diversa da EUR/USD
- [x] Collaudo manuale superato: compressione funzionante, campi popolati correttamente

### Pagine legali
- [x] Testi definitivi di Privacy Policy e Termini di Servizio, richiesti per la verifica del consenso Google OAuth
- [x] 🔐 Copertura di **entrambi** i percorsi di autenticazione (Google OAuth e registrazione diretta con email e password), allineati a quanto realmente attivo in `actions/auth.actions.ts`

### Trend di spesa
- [x] Metrica riallineata al Burn Rate: costo mensile **normalizzato** (annuale / 12) al posto dell'aggregazione dei `PaymentLog` reali → [[Gestione_Pagamenti_e_Rinnovi]]
- [x] ⚠️ Aritmetica in `Decimal` senza arrotondamenti intermedi: l'ultimo punto della serie coincide col KPI
- [x] Helper puro `lib/spending-trend.ts` + 8 test dedicati
- [x] Grafico riscritto con **Recharts** (`BarChart`, dati discreti) → [[Interfaccia_Grafica_Dashboard]]
- [x] ⚡ Code-splitting con `next/dynamic` e `ssr: false`: First Load JS della dashboard da 196 kB a **88,7 kB**

### Sistema documentale
- [x] `AI_law_subsync.md` — documento normativo unico (Legge 0, Regole 1-7, direttive, convenzioni, vincoli d'ambiente); `ARCHITECTURE.md` ridotto a documento tecnico
- [x] Regola 7 riscritta: log **modulari** in `.agent-logs/AAAA-MM-GG_slug.md`, changelog cumulativo abolito e diviso senza perdita di contenuto
- [x] Documentazione a **macro-aree** in `docs/` con nomi descrittivi, indicizzate da [[Index]]
- [x] `.obsidian/` aggiunta a `.gitignore`

---

## 📋 Backlog consolidato

> Residui degli Sprint 3, 5 e 7, raccolti qui invece di lasciare sprint chiusi a
> metà. Nessuno di questi blocca lo Sprint 8: si ripescano a obiettivo raggiunto,
> per tema e non per sprint di provenienza.

### 🎨 UI Mobile-First 🔴 _(da Sprint 7)_

_Priorità alta ma non bloccante: l'app è usabile su mobile, il debito è di
struttura del codice e di rifinitura._

- [ ] **Refactoring modulare**: isolare le sezioni complesse di `/subscriptions` e della Dashboard in micro-componenti (Regola 5) → [[Interfaccia_Grafica_Dashboard]]
- [ ] **Mobile-First**: ristrutturare layout e griglie sui breakpoint Tailwind (Regola 6) → [[Interfaccia_Grafica_Dashboard]], [[Motore_Regole_NextJS]]
- [ ] **Navigazione touch**: valutare bottom navigation al posto del drawer → [[Interfaccia_Grafica_Dashboard]]
- [ ] **Audit visivo**: overflow orizzontali e padding sui viewport stretti

### 🧾 Fiscalità 🟡 _(da Sprint 5)_

_Il motore di calcolo è scritto e corretto, ma non è importato da nessun file:
è un ramo del grafo che parte e si interrompe._

- [ ] Collegare `computeFiscalBreakdown` alle Server Action e alla UI → [[Fiscal Breakdown View]]
- [ ] CRUD delle categorie di spesa e applicazione dei default al form → [[Expense Category Actions]]
- [ ] **Suggeritore switch** mensile → annuale — _design scelto: campo `altCyclePrice` opzionale su `Subscription`_ → [[Switch Suggester]]
- [ ] Normalizzazione multi-valuta — _design scelto: API di cambio live + caching_ → [[Currency Normalizer]]

### 📲 PWA 🟢 _(da Sprint 3)_

- [ ] Strategia di cache per le viste read-only del Burn Rate — le viste autenticate sono dinamiche, va deciso cosa è lecito conservare sul dispositivo → [[Burn Rate Offline Cache]]
- [ ] Lighthouse PWA 90+ su build di produzione → [[Lighthouse Audit]]
- [ ] Startup image iOS dedicate

### 👤 Profilo e account 🟡 _(da Sprint 8)_

_Il profilo ha smesso di essere una vetrina di sola lettura con il nome
modificabile. Restano due evoluzioni con conseguenze fuori dalla pagina._

- [ ] **Selettore della valuta principale** — oggi il `<select>` nel profilo è decorativo: mostra EUR e USD, non salva niente e nessuno lo legge. Diventa reale solo insieme alla conversione, altrimenti sposta il problema invece di risolverlo: un utente che sceglie USD vedrebbe la stessa somma di valute miste con un altro simbolo davanti → [[Currency Normalizer]], [[Gestione_Pagamenti_e_Rinnovi]]
- [ ] **Dashboard "Pagamenti mancati o scaduti"** — abbonamenti con `nextRenewalDate` passata e nessun `PaymentLog` per quel ciclo: o il cron non è passato, o il pagamento è fallito davvero. Oggi la differenza fra i due casi è invisibile, e il secondo è quello che costa all'utente → [[Gestione_Pagamenti_e_Rinnovi]]
  - ⚠️ Si incrocia con l'ingestione email: una ricevuta che non arriva è essa stessa un segnale di pagamento mancato → [[Email_Ingestion_e_Matching]]
- [ ] Preferenza di fuso orario: resta bloccata su UTC per vincolo architetturale, ma la spiegazione nell'interfaccia va resa meno tecnica

### 🧪 Strumenti di sviluppo

- [x] **Seed di dati finti** per il collaudo visivo: 13 abbonamenti costruiti per popolare ogni vista del grafico, con storico, un disdetto e un aumento di prezzo
- [ ] ⚠️ **In locale si lavora sul database di produzione**: `.env.local` punta `DATABASE_URL` al pooler Supabase, quindi `NODE_ENV === "development"` è vero mentre si è collegati ai dati veri. Il seed se ne difende con un secondo cancello; va valutato se istituzionalizzare l'avvertenza in `AI_law_subsync.md`

---

## 📖 Legenda

| Simbolo  | Significato                                                   |
| -------- | ------------------------------------------------------------ |
| `- [ ]`  | Task da completare                                            |
| `- [x]`  | Task completata                                               |
| 🔴       | Alta Priorità — bloccante / fondazionale                      |
| 🟡       | Media Priorità — valore prodotto, non bloccante per il core   |
| 🟢       | Bassa Priorità / Backlog — feature avanzate                   |
| ⚠️       | Vincolo architetturale tassativo (vedi `ARCHITECTURE.md`)     |
| ♻️       | Invalidazione cache richiesta (`revalidatePath`)              |
| 🔐       | Task con implicazioni di sicurezza                            |
| `[[X]]`  | Nodo del grafo Obsidian — le note sono indicizzate in `docs/Index.md`; se la nota non esiste è un **ghost**, cioè lavoro non ancora progettato |

---

## 🔍 Note sulla Revisione

### Task Rimossi

| Task                           | Motivazione ingegneristica                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Integrazione Open Banking PSD2 | Scartata per instabilità delle API bancarie e ri-autenticazione obbligatoria ogni 90 giorni (SCA). Sostituita dall'**Email Ingestion** (Sprint 4). |

### Vincoli architetturali promossi ad Alta Priorità 🔴

| Vincolo                                  | Motivazione ingegneristica                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Forzatura date di rinnovo a 00:00:00 UTC | Previene bug di fuso orario (off-by-one day) nella visualizzazione e nei calcoli di rinnovo.            |
| Uso di Decimal.js / `Prisma.Decimal`     | Previene errori di arrotondamento float nei calcoli finanziari (Burn Rate): requisito non negoziabile.  |
| `revalidatePath` su ogni mutazione       | Garantisce coerenza tra cache di Next.js e stato reale del DB dopo ogni scrittura.                       |
