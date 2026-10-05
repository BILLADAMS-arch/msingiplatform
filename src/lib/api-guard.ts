import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthOutage, AUTH_UNAVAILABLE_BODY } from "@/lib/supabase/auth-errors";

type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

/** Resolves the Supabase user and rejects if the caller isn't signed in or isn't in `roles`. */
export async function requireRole(roles: Role[]) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) {
    // An unreachable auth service is not a sign-out: answer 503 so clients
    // show "try again" instead of treating the learner as logged out.
    if (isAuthOutage(error)) return { error: NextResponse.json(AUTH_UNAVAILABLE_BODY, { status: 503 }) } as const;
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) } as const;
  }
  const role = user.app_metadata?.role as Role | undefined;
  if (!role || !roles.includes(role)) {
    return { error: NextResponse.json({ error: "Not authorized for this action." }, { status: 403 }) } as const;
  }
  return { session: { user: { id: user.id, email: user.email, role } } } as const;
}
