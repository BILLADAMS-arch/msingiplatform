import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";

/**
 * True when getUser() failed because the auth service couldn't be reached or
 * errored (timeout, network, 5xx) — NOT because the visitor is signed out.
 * "No session" and a 4xx rejection of the token (expired/invalid/revoked)
 * are real sign-outs and return false.
 */
export function isAuthOutage(error: unknown): boolean {
  if (!error) return false;
  if (isAuthSessionMissingError(error)) return false;
  if (isAuthApiError(error) && error.status >= 400 && error.status < 500) return false;
  return true;
}

export const AUTH_UNAVAILABLE_BODY = {
  error: "auth_unavailable",
  message: "The sign-in service didn't respond. Please try again in a moment.",
} as const;
