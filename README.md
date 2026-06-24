# SubSync

**SaaS per il tracciamento degli abbonamenti e il calcolo del Monthly Burn Rate
normalizzato.** SubSync registra i tuoi abbonamenti (mensili e annuali), tiene
lo storico dei pagamenti e mostra in dashboard quanto stai spendendo, riportato
a un costo mensile equivalente (`mensili + annuali / 12`).

---

## Stack tecnologico

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL** (via Docker)
- **Tailwind CSS**
- **pnpm** (package manager)
- **Lucide React** (icone)

---

## Prerequisiti

- **Node.js** >= 18.17 (consigliata l'ultima LTS)
- **pnpm** >= 9 (`npm i -g pnpm`)
- **Docker** + Docker Compose (per il database PostgreSQL)
- Un file `.env` con `DATABASE_URL` (vedi `.env.example`):

  ```env
  DATABASE_URL="postgresql://subsync:subsync_password@localhost:5432/subsync_db?schema=public"
  ```

---

## Avvio rapido

```bash
# 1. Avvia il database PostgreSQL in background
docker compose up -d

# 2. Installa le dipendenze
pnpm install

# 3. Applica lo schema al database e genera il Prisma Client
pnpm dlx prisma migrate dev

# 4. Avvia il server di sviluppo
pnpm dev
```

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000).

---

## Comandi utili

| Comando                          | Descrizione                                        |
| -------------------------------- | -------------------------------------------------- |
| `docker compose up -d`           | Avvia il container PostgreSQL                      |
| `docker compose down`            | Ferma il container (i dati restano nel volume)     |
| `pnpm install`                   | Installa le dipendenze                             |
| `pnpm dev`                       | Avvia il server di sviluppo (hot reload)           |
| `pnpm build` / `pnpm start`      | Build ed esecuzione in produzione                  |
| `pnpm dlx prisma migrate dev`    | Crea e applica una migrazione in sviluppo          |
| `pnpm dlx prisma studio`         | GUI di ispezione del database                      |
| `pnpm dlx prisma generate`       | Rigenera il Prisma Client                          |
# SubSync_Repo
