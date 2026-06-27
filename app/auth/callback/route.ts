import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * 🔐 Route handler di callback auth (Sprint 2).
 * Riceve il `code` dai link Supabase (conferma email / magic link / OAuth) e lo
 * scambia per una sessione, impostando i cookie via il client server-side dello
 * Sprint 1. Poi reindirizza all'app. Escluso dal middleware (matcher `auth`).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Codice mancante o scambio fallito → torna al login con flag d'errore.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
