import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * 🔐 Auth — sessione utente via Supabase (cookie, App Router).
 *
 * Memoizzato con `React.cache`: durante un singolo render-pass del server,
 * `supabase.auth.getUser()` viene invocato UNA sola volta anche se layout,
 * pagina e più Server Actions chiamano `getCurrentUser()` (no request
 * amplification sull'endpoint di auth).
 *
 * `getUser()` verifica il token con il server di auth Supabase (più sicuro di
 * `getSession()` lato server). Lancia se non c'è una sessione valida, così le
 * Server Actions falliscono in modo esplicito anziché scrivere record orfani.
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non autenticato: nessuna sessione Supabase valida.");
  }
  return user;
});

/** Id dell'utente Supabase corrente (UUID), usato come `userId` sui record. */
export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
