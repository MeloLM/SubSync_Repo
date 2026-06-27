import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 🔐 Middleware di protezione (Sprint 2).
 * Protegge l'intero route group `app/(dashboard)`: senza una sessione Supabase
 * valida, forza il redirect su `/login`. Rinfresca anche i cookie di sessione
 * propagandoli sulla response (pattern @supabase/ssr per il middleware).
 *
 * Nota: il middleware gira nell'Edge runtime, quindi crea il proprio client
 * con l'API request/response cookies; le Server Actions usano invece il client
 * server-side dello Sprint 1 (`lib/supabase/server.ts`).
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Credenziali non ancora configurate → tratta come non autenticato.
  if (!url || !anon) {
    return redirectToLogin(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(request);
  }

  return response;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  return NextResponse.redirect(loginUrl);
}

/**
 * Esegue il middleware su tutto tranne: asset statici di Next, favicon,
 * la pagina `/login`, le route `/auth/*` e `/api/*`, e i file con estensione.
 * Restano protette: `/`, `/subscriptions`, `/payments`, `/profile`.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|auth|api|.*\\..*).*)"],
};
