import { cache } from "react";
import type { User } from "@supabase/supabase-js";

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

/**
 * Nome visualizzato dell'utente, o stringa vuota se non l'ha impostato.
 *
 * Vive nei `user_metadata` di Supabase, che sono JSON libero: il valore può
 * mancare, essere vuoto o non essere affatto una stringa. Va normalizzato a ogni
 * lettura, e questo è l'unico punto in cui farlo — lo leggono sia la pagina
 * profilo sia il layout della dashboard, e due normalizzazioni divergenti
 * mostrerebbero due nomi diversi nella stessa schermata.
 */
export function fullNameOf(user: User): string {
  const raw = user.user_metadata?.full_name;
  return typeof raw === "string" ? raw.trim() : "";
}
