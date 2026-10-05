import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAuthOutage, AUTH_UNAVAILABLE_BODY } from "@/lib/supabase/auth-errors";

type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

const ROLE_PREFIXES: Record<string, Role[]> = {
  "/teacher": ["TEACHER", "ADMIN"],
  "/api/teacher": ["TEACHER", "ADMIN"],
  "/parent": ["PARENT", "ADMIN"],
  "/api/parent": ["PARENT", "ADMIN"],
  // More specific than "/api/admin" below, and checked first (lookup is
  // first-match-by-insertion-order) — the resources route itself already
  // declares requireRole(["TEACHER","ADMIN"]); this is what actually makes
  // that reachable instead of being blocked by the general admin-only rule.
  "/api/admin/resources": ["TEACHER", "ADMIN"],
  "/admin": ["ADMIN"],
  "/api/admin": ["ADMIN"],
  "/dashboard": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
  "/learn": ["STUDENT", "ADMIN"],
  "/practice": ["STUDENT", "ADMIN"],
  "/tests": ["STUDENT", "ADMIN"],
  "/progress": ["STUDENT", "ADMIN"],
  "/mistakes": ["STUDENT", "ADMIN"],
  // Signed-in pages that previously relied only on their APIs' guards; a
  // signed-out visitor now goes to /login instead of a page whose requests
  // all fail. Roles mirror what each page's API already allows.
  "/ai": ["STUDENT", "ADMIN"],
  "/leaderboard": ["STUDENT", "ADMIN"],
  "/upgrade": ["STUDENT", "PARENT", "ADMIN"],
  "/library": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
  "/flashcards": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
  "/playground": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
  "/search": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
  "/profile": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((p) => pathname.startsWith(p));

  const { response, user, error } = await updateSession(request);
  if (!matchedPrefix) return response;

  if (!user && isAuthOutage(error)) {
    // Auth service unreachable — don't log the learner out. APIs get a 503
    // (clients offer Retry); pages load their shell, which holds no data
    // and whose APIs still enforce sign-in and roles themselves.
    if (pathname.startsWith("/api/")) return NextResponse.json(AUTH_UNAVAILABLE_BODY, { status: 503 });
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.app_metadata?.role as Role | undefined;
  const allowedRoles = ROLE_PREFIXES[matchedPrefix];
  if (!role || !allowedRoles.includes(role)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/learn/:path*", "/practice/:path*", "/tests/:path*",
    "/progress/:path*", "/mistakes/:path*", "/teacher/:path*", "/parent/:path*", "/admin/:path*",
    "/ai/:path*", "/leaderboard/:path*", "/upgrade/:path*", "/library/:path*", "/flashcards/:path*",
    "/playground/:path*", "/search/:path*", "/profile/:path*",
    "/api/teacher/:path*", "/api/parent/:path*", "/api/admin/:path*"],
};
