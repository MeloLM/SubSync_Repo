/**
 * Percorso di redirect sicuro (Sprint 8, intervento 4).
 *
 * Il parametro `next` di `/auth/callback` finisce concatenato all'origine del sito:
 * `https://dominio` + `@evil.com` diventa `https://dominio@evil.com`, che il browser
 * legge come utente `dominio` sull'host `evil.com` (open redirect). Qui si accetta
 * solo un percorso interno.
 */

/** Destinazione di ripiego: la dashboard, che in questa app è la root. */
export const DEFAULT_REDIRECT_PATH = "/";

/** Caratteri di controllo: i browser li scartano dagli URL (`/\t/evil.com` → `//evil.com`). */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Restituisce `next` se è un percorso interno, altrimenti `/`.
 *
 * Accettato: inizia con `/`, e il secondo carattere non è `/` né `\` (i browser
 * trattano `\` come `/`: `/\evil.com` è un URL protocol-relative). Rifiutati:
 * `null`, vuoto, URL assoluti, `@host`, percorsi relativi senza `/` iniziale e
 * qualunque stringa con caratteri di controllo.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (typeof next !== "string" || next.length === 0) return DEFAULT_REDIRECT_PATH;
  if (CONTROL_CHARS.test(next)) return DEFAULT_REDIRECT_PATH;
  if (!next.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_REDIRECT_PATH;
  return next;
}
