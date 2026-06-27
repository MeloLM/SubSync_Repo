import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase lato server (App Router).
 * Legge/aggiorna la sessione utente tramite cookie. Da usare in Server
 * Components, Server Actions e Route Handlers.
 *
 * Pattern `getAll`/`setAll` come da documentazione aggiornata di @supabase/ssr.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Invocato da una Server Component: ignorabile se il refresh
            // della sessione è gestito dal middleware.
          }
        },
      },
    },
  );
}
