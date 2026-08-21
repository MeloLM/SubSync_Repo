# 2026-07-22 17:17 (+0200) — Fix autenticazione (callback OAuth, UI, trigger DB)

- **Fix loop OAuth (`app/auth/callback/route.ts`)**: riscritta la rotta col pattern
  request→response. I cookie di sessione da `exchangeCodeForSession` ora vengono
  scritti **direttamente sulla response di redirect** (client SSR inline con
  `getAll` da `request.cookies` e `setAll` su `response.cookies`), invece di
  affidarsi a `next/headers` + `NextResponse.redirect` (che non attacca in modo
  affidabile i `Set-Cookie` → sessione persa → redirect a /login = il loop).
  Redirect finale a `next ?? "/"` (in questa app la dashboard è la root `/`,
  non esiste `/dashboard`).
- **UX login (`components/forms/login-form.tsx`)**: aggiunto toggle
  **mostra/nascondi password** (icone `Eye`/`EyeOff`) dentro l'input; `type`
  commuta tra `password` e `text`; pulsante accessibile (`aria-label`/`aria-pressed`),
  padding input a `!pr-10` per non sovrapporre il testo all'icona.
- **Trigger sync utenti (`supabase/migrations/sync_users_trigger.sql`)**: script da
  incollare in Supabase. ⚠️ Il progetto usa già `public."User"` (Prisma), non
  `public.users`: il trigger `AFTER INSERT ON auth.users` → funzione
  `handle_new_user()` (SECURITY DEFINER) popola la tabella Prisma esistente
  (idempotente, `on conflict do nothing`), evitando una seconda tabella divergente.
  Incluso backfill opzionale.
- Verifica: `tsc --noEmit` + `next build` Exit 0. Trigger SQL **eseguito su
  Supabase** (attivo su `auth.users`) e **backfill utenti storici** completato.
  Consolidato nel commit `fix(auth): callback OAuth PKCE, toggle password e trigger
  sync utenti (Sprint 7)` + push su origin. Reminder: abilitare il provider Google
  in Supabase → Authentication → Providers.
