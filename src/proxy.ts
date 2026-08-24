import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

const ROLE_PREFIXES: Record<string, Role[]> = {
  "/teacher": ["TEACHER", "ADMIN"],
  "/api/teacher": ["TEACHER", "ADMIN"],
  "/parent": ["PARENT", "ADMIN"],
  "/api/parent": ["PARENT", "ADMIN"],
  "/admin": ["ADMIN"],
  "/api/admin": ["ADMIN"],
  "/dashboard": ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
  "/learn": ["STUDENT", "ADMIN"],
  "/practice": ["STUDENT", "ADMIN"],
  "/tests": ["STUDENT", "ADMIN"],
  "/progress": ["STUDENT", "ADMIN"],
  "/mistakes": ["STUDENT", "ADMIN"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((p) => pathname.startsWith(p));

  const { response, user } = await updateSession(request);
  if (!matchedPrefix) return response;

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
    "/api/teacher/:path*", "/api/parent/:path*", "/api/admin/:path*"],
};
