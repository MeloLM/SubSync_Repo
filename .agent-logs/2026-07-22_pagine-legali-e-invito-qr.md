# 2026-07-22 17:48 (+0200) — Scaffold pagine legali + Schermata Invito (QR)

- **Pagine legali (route group `(marketing)`)**: nuove rotte pubbliche `/privacy` e
  `/terms` (server component, statiche) con layout condiviso e testo placeholder
  "Lorem ipsum" da sostituire. **Middleware** aggiornato per escludere `privacy` e
  `terms` dalla protezione (necessario per l'approvazione OAuth Google). Aggiunto un
  footer legale nel `login-form` ("Accedendo accetti i Termini e la Privacy Policy").
- **Schermata Invito (`/invite`)**: installata `qrcode.react@4.2.0`; nuova rotta
  `app/(dashboard)/invite/page.tsx` (sottile) + `components/invite/invite-card.tsx`
  (client). QR **SVG** che codifica `window.location.origin` (generato in locale →
  nessuna richiesta esterna, PWA/CSP-safe), su sfondo chiaro per la scansionabilità.
  Azioni: **Copia link** (`navigator.clipboard`) e **Condividi** via Web Share API
  (`navigator.share`) mostrato solo se supportato, con fallback a copia. Voce "Invita"
  aggiunta al nav (`sidebar-content`), visibile in sidebar desktop e tendina mobile.
- **TODO.md**: task QR Code spuntata.
- Verifica: `tsc --noEmit` + `next build` **Exit 0** (16/16 pagine: `/invite`,
  `/privacy`, `/terms` nuove). In attesa di conferma per il commit.
