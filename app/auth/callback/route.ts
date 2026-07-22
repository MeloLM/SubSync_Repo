import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 🔐 Route handler di callback auth (Sprint 2 · fix OAuth Sprint 7).
 * Riceve il `code` dai link Supabase (conferma email / magic link / OAuth PKCE)
 * e lo scambia per una sessione.
 *
 * ⚠️ Fix loop OAuth: i cookie di sessione vengono scritti DIRETTAMENTE sulla
 * response di redirect (pattern request→response, come nel middleware). Usare qui
 * il client basato su `next/headers` è inaffidabile: i `Set-Cookie` non si
 * attaccano in modo garantito alla response creata da `NextResponse.redirect`,
 * lasciando l'utente senza sessione → redirect a /login (il loop).
 *
 * Escluso dal middleware (matcher `auth`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` opzionale; default alla dashboard che in questa app è la root `/`.
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Response di redirect creata SUBITO: i cookie di sessione impostati da
  // exchangeCodeForSession vengono scritti su questa response e quindi persistiti.
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return response;
}
