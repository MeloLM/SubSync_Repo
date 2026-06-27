"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * 🔐 Server Actions di autenticazione (Sprint 2).
 * Usano il client Supabase server-side configurato nello Sprint 1
 * (`lib/supabase/server.ts`), che legge/scrive la sessione via cookie.
 */

export type AuthResult = { ok?: boolean; error?: string; message?: string };

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
    return {
      message:
        "Account creato. Controlla l'email per la conferma, poi effettua l'accesso.",
    };
  } catch {
    return { error: NOT_CONFIGURED };
  }
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
