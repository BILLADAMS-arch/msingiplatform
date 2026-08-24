import { createClient } from "@supabase/supabase-js";

// Service-role client — server-only, never expose to the browser. Used for
// admin.createUser() at registration and for Storage uploads, both of which
// need to bypass per-user auth since authorization is enforced in our own
// API routes (requireRole()), not Supabase RLS.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
