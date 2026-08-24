import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client bound to the request's cookies — used in Route Handlers
// and Server Components in place of NextAuth's auth(). Reads the signed-in
// user via getUser(), which revalidates against Supabase rather than trusting
// the cookie payload.
export async function createClient() {
  const cookieStore = await cookies();

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
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written — safe to ignore since the proxy refreshes the session.
          }
        },
      },
    },
  );
}
