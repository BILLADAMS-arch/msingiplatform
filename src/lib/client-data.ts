"use client";
// Shared, short-lived request cache for data that several components ask for
// on the same page load (the Shell sidebar and the page itself both need the
// learner's profile and their grade's subjects). One in-flight request is
// shared; failures are never cached, so Retry always refetches.

type Entry<T> = { at: number; promise: Promise<T> };

const PROFILE_TTL = 10_000; // profile can change (name, XP) — keep it brief
const SUBJECTS_TTL = 5 * 60_000; // curriculum rarely changes

let profileEntry: Entry<unknown> | null = null;
const subjectEntries = new Map<string, Entry<unknown>>();

export class HttpError extends Error {
  constructor(public status: number, url: string) { super(`${url} → ${status}`); }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new HttpError(res.status, url);
  return res.json();
}

function cached<T>(get: () => Entry<unknown> | null | undefined, set: (e: Entry<unknown> | null) => void, ttl: number, url: string): Promise<T> {
  const hit = get();
  if (hit && Date.now() - hit.at < ttl) return hit.promise as Promise<T>;
  const promise = getJson<T>(url);
  const entry = { at: Date.now(), promise };
  set(entry);
  promise.catch(() => { if (get() === entry) set(null); });
  return promise;
}

/** GET /api/profile, shared across components for a few seconds. */
export function getProfile<T = { profile: Record<string, unknown> | null; gradeId: string | null; gradeName: string | null }>(): Promise<T> {
  return cached<T>(() => profileEntry, (e) => { profileEntry = e; }, PROFILE_TTL, "/api/profile");
}

/** GET /api/curriculum/subjects?gradeId=…, shared across components. */
export function getSubjects<T = { subjects: { id: string; name: string }[] }>(gradeId: string): Promise<T> {
  return cached<T>(() => subjectEntries.get(gradeId), (e) => { if (e) subjectEntries.set(gradeId, e); else subjectEntries.delete(gradeId); },
    SUBJECTS_TTL, `/api/curriculum/subjects?gradeId=${encodeURIComponent(gradeId)}`);
}

/** Call after the learner's profile changes, or on sign-out. */
export function clearClientData() {
  profileEntry = null;
  subjectEntries.clear();
}
