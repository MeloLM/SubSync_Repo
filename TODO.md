# 🗺️ Roadmap — SubSync

| Metadato         | Valore                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| **Last Updated** | 2026-07-08                                                             |
| **Status**       | 🟢 **SPRINT 6 COMPLETATO** — Produzione LIVE su Vercel (app stabile: auth SSR, DB Supabase via Prisma). CI **GitHub Actions** attiva (lint · typecheck · unit test · build) + **unit test (Vitest)** sugli helper critici `money`/`date` (Regola 1 Decimal, Regola 2 UTC). Completati: **Split-Billing** (S5), **AI Receipt Scanner** (S4, Gemini `gemini-2.5-flash`). Backlog: Fiscalità & Ottimizzazione (S5 — richiede sblocco `schema.prisma`), Email Ingestion (S4), residui S3 (cache read-only, Lighthouse). |
| **Goal**         | Tracciare gli abbonamenti e calcolare il **Monthly Burn Rate** normalizzato, con importi monetari accurati (Decimal) e date timezone-safe (00:00:00 UTC). |
| **Pipeline**     | 6 Sprint a granularità fine — micro-cicli specializzati per prevenire il degrado del contesto. |

> **Direttiva per l'agente:** questo file è la fonte di verità sullo stato di
> avanzamento. Ogni volta che una funzionalità viene completata, la relativa
> task va spuntata (`- [x]`) autonomamente, aggiornando anche **Last Updated** e
> **Status**. Uno Sprint è concluso solo quando **tutte** le sue sotto-task sono
> spuntate. Un solo Sprint attivo alla volta: niente lavoro fuori contesto.

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

## 🟡 SPRINT 3 — PWA & Mobile Optimization

> 🟡 Da web app a prodotto installabile, fruibile e resiliente in mobilità.

### Installabilità
- [x] `app/manifest.ts` — `name`, `short_name`, `theme_color`, `display: standalone` (→ `/manifest.webmanifest`)
- [x] Iconografia — `192x192`, `512x512` + `512` **maskable** (PNG reali in `public/`)
- [x] `apple-touch-icon` (180) + meta `apple-mobile-web-app-*` _(startup image iOS dedicate: rinviate)_

### Offline & Service Worker
- [x] **Service Worker** (`public/sw.js`) — cache-first su asset statici (`/_next/static` + icone)
- [x] **Offline fallback** — `public/offline.html` + navigations network-first con fallback
- [ ] Strategia di cache per le viste read-only del Burn Rate _(viste autenticate/dinamiche: da progettare)_

### Meta & UX mobile
- [x] Meta tag **iOS/Android** (`apple-mobile-web-app-*`, `theme-color`, `viewport-fit=cover`)
- [x] Componente **Install Prompt** (A2HS) — banner dedicato su `beforeinstallprompt`
- [ ] Audit responsive + Lighthouse PWA ≥ 90 _(da eseguire manualmente su build prod)_

---

## 🟡 SPRINT 4 — Asynchronous Automations

> 🟡 Automazioni che eliminano l'inserimento manuale e tengono i dati sempre freschi.

### 📥 Email Ingestion
- [ ] Endpoint **webhook** ricezione email (provider inbound, es. mailbox dedicata)
- [ ] Parser fatture/ricevute → estrazione `name` / `amount` / `paidAt`
- [ ] ⚠️ Persistenza `PaymentLog` con `amount` Decimal e `paidAt` in UTC
- [ ] Matching automatico ricevuta → `Subscription` esistente

### ⏰ Cron Job rinnovi
- [x] Endpoint locale di test `/api/cron/renewals` (route handler) — testato (401/200)
- [x] 🔐 Protezione endpoint con `CRON_SECRET` (header `Authorization: Bearer`)
- [x] Configurazione **Vercel Cron** (`vercel.json`, schedule giornaliero `0 6 * * *`)
- [x] ⚠️ Avanzamento `nextRenewalDate` a rinnovo avvenuto (sempre 00:00:00 UTC, `advanceRenewalDate`)
- [x] Creazione `PaymentLog` automatica al rinnovo + ♻️ `revalidatePath`
- [x] Idempotenza (no doppi log sullo stesso ciclo) — verificata su DB reale

### 👁️ AI Receipt Scanner (Vision API) `[COMPLETATO]`
- [x] Integrazione UI: Dropzone (`react-dropzone`) nel form `/subscriptions/new` — componente `image-scanner` + wrapper `subscription-scanner-form`.
- [x] Server Action: `actions/vision.actions.ts` — SDK ufficiale **Google Gemini** (`@google/genai`, modello `gemini-1.5-flash`), immagine via `inlineData`; chiave da `GEMINI_API_KEY`.
- [x] Prompt Engineering: `systemInstruction` + output vincolato con `responseMimeType: application/json` e `responseSchema` (JSON Schema rigoroso) → `{ name, amount, currency, billingCycle }`.
- [x] Auto-fill: JSON cablato ai campi del form via handle imperativo (`setValue`-like su form controllato); toast "Fattura analizzata! Controlla i dati prima di salvare."

---

## 🟡 SPRINT 5 — Enterprise & B2B Features

> 🟢 Feature ad alto valore aggiunto che differenziano il prodotto (post-MVP).

### Split-Billing `[COMPLETATO]`
- [x] Modello dati condivisione spese tra utenti (quote/membri) — `SubscriptionMember` (account reali + inviti via email, enum `InviteStatus`, `shareWeight` Decimal, settlement)
- [x] Algoritmo di ripartizione importi — ⚠️ `splitByWeights` interamente in **Decimal**, somma esatta col resto in centesimi (metodo del resto maggiore); proprietario implicito a peso 1 (`lib/split.ts`)
- [x] Vista "chi deve cosa" + stato di settlement — proprietario: `/subscriptions/[id]/split`; invitato: `/shared` (inviti accetta/rifiuta + condivisi con me) + badge inviti in sidebar
- _Nota: il Monthly Burn Rate resta sul costo degli abbonamenti posseduti (Regola 4 invariata in questo pass)._

### Fiscalità & Ottimizzazione
- [ ] Modulo **deducibilità fiscale** per freelance / Partita IVA
- [ ] **Suggeritore switch** mensile → annuale quando conviene (calcolo risparmio in Decimal) — _design scelto: campo `altCyclePrice` opzionale sulla Subscription_
- [ ] Normalizzazione multi-valuta per aggregazioni cross-currency — _design scelto: API di cambio live + caching_

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
