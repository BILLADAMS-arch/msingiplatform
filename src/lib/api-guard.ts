import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

/** Resolves the Supabase user and rejects if the caller isn't signed in or isn't in `roles`. */
export async function requireRole(roles: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) } as const;
  }
  const role = user.app_metadata?.role as Role | undefined;
  if (!role || !roles.includes(role)) {
    return { error: NextResponse.json({ error: "Not authorized for this action." }, { status: 403 }) } as const;
  }
  return { session: { user: { id: user.id, email: user.email, role } } } as const;
}
