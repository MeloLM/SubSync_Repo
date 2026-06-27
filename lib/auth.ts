import { createClient } from "@/lib/supabase/server";

/**
 * 🔐 Auth — sessione utente via Supabase (cookie, App Router).
 *
 * `getUser()` verifica il token con il server di auth Supabase (più sicuro di
 * `getSession()` lato server). Lancia se non c'è una sessione valida, così le
 * Server Actions falliscono in modo esplicito anziché scrivere record orfani.
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non autenticato: nessuna sessione Supabase valida.");
  }
  return user;
}

/** Id dell'utente Supabase corrente (UUID), usato come `userId` sui record. */
export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
