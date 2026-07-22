"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

/**
 * 🔐 Server Actions di autenticazione (Sprint 2).
 * Usano il client Supabase server-side configurato nello Sprint 1
 * (`lib/supabase/server.ts`), che legge/scrive la sessione via cookie.
 */

export type AuthResult = { ok?: boolean; error?: string };

const NOT_CONFIGURED =
  "Supabase non configurato: compila .env.local con le tue credenziali e riavvia il server.";

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { ok: true };
  } catch {
    return { error: NOT_CONFIGURED };
  }
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email e password sono obbligatorie." };
  }
  if (password.length < 6) {
    return { error: "La password deve avere almeno 6 caratteri." };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // Conferma email disattivata lato Supabase: signUp imposta già la sessione
    // (cookie) → l'utente è autenticato, accesso immediato senza passaggio email.
    return { ok: true };
  } catch {
    return { error: NOT_CONFIGURED };
  }
}

/**
 * 🔐 Social login via OAuth (Google). Genera l'URL di autorizzazione Supabase e
 * reindirizza il browser al provider. Al ritorno, `/auth/callback` scambia il
 * `code` per la sessione (stesso flusso di conferma email).
 *
 * NB: il provider Google va abilitato nel pannello Supabase (Authentication →
 * Providers) perché il flusso funzioni end-to-end.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  let url: string | null = null;
  try {
    const supabase = createClient();
    const origin = headers().get("origin") ?? "";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) return { error: error.message };
    url = data?.url ?? null;
  } catch {
    return { error: NOT_CONFIGURED };
  }

  // `redirect` DEVE stare fuori dal try/catch: lancia NEXT_REDIRECT di proposito.
  if (!url) return { error: "Impossibile avviare l'accesso con Google." };
  redirect(url);
}

export async function signOut(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Nessuna sessione/credenziale: procedi comunque al redirect.
  }
  redirect("/login");
}
