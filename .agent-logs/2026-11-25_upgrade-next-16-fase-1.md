# Upgrade a Next 16, fase 1 (lato server) — 2026-11-25

## Richiesta
Fase 1 dell'upgrade Next 14 -> 16 sul branch `chore/upgrade-next-16`: dipendenze,
API di richiesta asincrone, `middleware.ts` -> `proxy.ts`, ESLint 9 flat config.
Trasformazioni a mano, niente codemod. Prisma resta alla 5, TypeScript alla 5.x.
La fase 2 (componenti client, librerie UI, lint lato client) spetta a IRIDE.

## Cache di pnpm
`pnpm cache delete nanoid` ha cancellato solo `registry.npmjs.org/nanoid.jsonl`
(metadati del pacchetto). Al rilancio `pnpm add` e' riuscito al primo colpo:
non e' servito svuotare le cartelle `metadata*`. Nessuna policy sull'eta' dei
rilasci e' stata disattivata.

## File creati o modificati
- `package.json`, `pnpm-lock.yaml`: next 16.4.6, react e react-dom 19.3.1,
  react-is ^19.3.1, @types/react e @types/react-dom 19, eslint 9, eslint-config-next
  16.4.6, @types/node ^24, `engines.node` 24.x; script `lint` = `eslint .`.
  `allowBuilds` verificato: nessun nuovo pacchetto con postinstall, invariato.
  Override di react-is non necessario: recharts risolve alla 19; resta una 16.13.1
  transitiva di `prop-types` (react-dropzone, eslint-plugin-react), innocua.
- `lib/supabase/server.ts`: `createClient` async con `await cookies()`.
- `lib/auth.ts`: `await createClient()` dentro `cache(...)`, dedup invariata.
- `actions/auth.actions.ts`: 5 chiamate con `await`, `(await headers()).get("origin")`.
- `app/(dashboard)/subscriptions/[id]/edit/page.tsx` e `.../[id]/split/page.tsx`:
  `params: Promise<{ id: string }>` e `await params`.
- `middleware.ts` -> `proxy.ts` (git mv): export `proxy`, stesso matcher, stesse rotte
  protette, stesso refresh dei cookie. Il runtime passa da Edge a Node.js (in Next 16
  il proxy non supporta Edge). Aggiornati i commenti che citavano il middleware in
  `app/(marketing)/layout.tsx`, `app/api/cron/renewals/route.ts`,
  `app/auth/callback/route.ts`, `lib/supabase/server.ts`.
- `eslint.config.mjs` (nuovo): `defineConfig` + `eslint-config-next/core-web-vitals`,
  `globalIgnores` per `.next`, `lib/generated/**`, `public/sw.js` (piu' `node_modules`
  e `next-env.d.ts`). `.eslintrc.json` rimosso.
- `postcss.config.mjs`: oggetto assegnato a una variabile prima dell'export
  (warning `import/no-anonymous-default-export`).
- `tsconfig.json`: riscritto automaticamente da `next build` (`jsx: react-jsx`,
  `include` con `.next/dev/types/**/*.ts`, array su piu' righe). Committato a parte.
- `ci.yml`: non modificato (Node 24 e `pnpm run lint` gia' compatibili).

## Verifica
- `npx tsc --noEmit`: pulito (anche dopo la riscrittura di tsconfig.json).
- `pnpm run lint`: 3 errori, tutti nei componenti client (vedi Osservazioni).
- `npx vitest run`: 9 file, 290 test passati.
- `npx next build` (con env fittizie come in CI): compilato, 17 rotte, "Proxy
  (Middleware)" riconosciuto. Due warning Turbopack "Dynamic filesystem access causes
  tracing of the whole project" sul client Prisma generato (`lib/generated/prisma/
  runtime/library.js`), raggiunto da `app/api/cron/renewals/route.ts` e da
  `app/(dashboard)/subscriptions/page.tsx`.
- `pnpm build` NON eseguito (deroga dell'utente alla Parte IV).
- Node locale e' v25.0.0 mentre `engines` chiede 24.x: pnpm non ha bloccato nulla.

## Osservazioni
Errori di lint lato client, per IRIDE (regola `react-hooks/set-state-in-effect`):
- `components/dashboard/mobile-nav.tsx:22` (`setOpen(false)` nell'effetto su pathname)
- `components/invite/invite-card.tsx:19` (`setUrl(window.location.origin)`, `setCanShare`)
- `components/pwa/install-prompt.tsx:75` (`setHidden(isDismissed())`, `setChecked(true)`)
I warning di build sul tracing di Prisma non bloccano e riguardano il layer server.
