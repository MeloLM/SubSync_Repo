# SubSync

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](#)

> **Stop guessing. Start tracking.** La piattaforma SaaS che trasforma il caos
> dei tuoi abbonamenti in un singolo numero che conta: il **Monthly Burn Rate**.

---

## 💡 Perché SubSync

Gli abbonamenti silenziosi sono il punto cieco della finanza personale e dei team:
mensili, annuali, in valute diverse — impossibili da confrontare a colpo d'occhio.

**SubSync** è una **PWA SaaS installabile** che centralizza ogni costo ricorrente e
lo normalizza in un **costo mensile equivalente** (`mensili + annuali / 12`),
con **accuratezza monetaria a prova di arrotondamento** e **date timezone-safe**.
Un'unica fonte di verità sul tuo Burn Rate, sul desktop e in tasca.

## ✨ Core Features

| | Feature | Descrizione |
| --- | --- | --- |
| 🔥 | **Monthly Burn Rate** | Spesa ricorrente normalizzata a costo mensile, aggregata server-side. |
| 💳 | **Gestione Abbonamenti** | CRUD completo: servizio, importo, valuta, ciclo, prossimo rinnovo. La disdetta è **logica**: lo storico resta intatto. |
| 🧾 | **Storico Pagamenti** | Timeline cronologica delle uscite di cassa per abbonamento. |
| 📲 | **PWA & Offline** | Installabile su iOS/Android, service worker con fallback offline. |
| 👁️ | **Scanner IA Ricevute** | Estrazione automatica dei dati da foto di fattura via Google Gemini. |
| 📈 | **Spesa media e Addebiti reali** | Due metriche, tre finestre (30 giorni, 6 mesi, 1 anno) e proiezione dei rinnovi futuri. Le barre si selezionano per sommarle. |
| 📥 | **Email Ingestion** | Aggiornamento automatico di prezzi e rinnovi da ricevute email _(modello e schema pronti, webhook da fare)_. |
| ⏰ | **Rinnovi Automatici** | Cron job giornaliero che avanza le date di rinnovo e logga i pagamenti. |
| 🤝 | **Split-Billing** | Condivisione spese fra utenti: inviti, quote in Decimal, settlement. |
| 🧾 | **Fiscalità** | Deducibilità e IVA per Partita IVA _(motore pronto, UI in backlog)_. |
| 🔐 | **Auth Supabase** | Sessione sicura via cookie (SSR, App Router). |

---

## 🧱 Stack tecnologico

- **Next.js 14** (App Router) · **TypeScript**
- **Prisma ORM** · **PostgreSQL** (via Docker)
- **Supabase** (Auth SSR via `@supabase/ssr`)
- **Tailwind CSS** · **Lucide React** (icone) · **Recharts** (grafici)
- **Google Gemini** (`@google/genai`) per lo scanner ricevute
- **Vitest** — 73 test sugli helper puri: denaro, date, stato degli abbonamenti, spesa media e flusso di cassa
- **Vercel** (hosting, cron job) — app live in produzione
- **pnpm** (package manager)

---

## 🚀 Avvio rapido

```bash
# 1. Avvia il database PostgreSQL in background
docker compose up -d

# 2. Installa le dipendenze
pnpm install

# 3. Configura le variabili d'ambiente
cp .env.example .env   # poi inserisci le credenziali Supabase

# 4. Applica lo schema al database e genera il Prisma Client
pnpm dlx prisma migrate dev

# 5. Avvia il server di sviluppo
pnpm dev
```

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000).

### Prerequisiti

- **Node.js** >= 18.17 (consigliata l'ultima LTS)
- **pnpm** >= 9 (`npm i -g pnpm`)
- **Docker** + Docker Compose (per il database PostgreSQL)

---

## 🏛️ Architettura & vincoli

SubSync è costruito su **regole architetturali vincolanti** non negoziabili —
importi monetari sempre in `Decimal` (mai float), date di rinnovo forzate a
`00:00:00 UTC`, invalidazione cache su ogni mutazione, aggregazione del Burn Rate
isolata sul server.

👉 Le regole vivono in **[AI_law_subsync.md](AI_law_subsync.md)**, unico documento
normativo del progetto: **lettura obbligatoria e integrale prima di toccare il
codice**. La struttura tecnica (cartelle, schema relazionale, mappa della
documentazione) è in **[ARCHITECTURE.md](ARCHITECTURE.md)**, e le note di
dominio in **[docs/](docs/)**, navigabili come grafo con Obsidian.

La roadmap di prodotto è in **[TODO.md](TODO.md)**: gli Sprint 1-7 sono chiusi,
lo **Sprint 8** in corso porta la cessazione logica degli abbonamenti e
l'ingestione email.

---

## 🛠️ Comandi utili

| Comando                          | Descrizione                                        |
| -------------------------------- | -------------------------------------------------- |
| `docker compose up -d`           | Avvia il container PostgreSQL                       |
| `docker compose down`            | Ferma il container (i dati restano nel volume)     |
| `pnpm install`                   | Installa le dipendenze                             |
| `pnpm dev`                       | Avvia il server di sviluppo (hot reload)           |
| `pnpm build` / `pnpm start`      | Build ed esecuzione in produzione                  |
| `pnpm dlx prisma migrate dev`    | Crea e applica una migrazione in sviluppo          |
| `pnpm dlx prisma studio`         | GUI di ispezione del database                      |
| `pnpm dlx prisma generate`       | Rigenera il Prisma Client                          |
