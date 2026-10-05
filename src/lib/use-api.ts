"use client";
import { useCallback, useEffect, useState } from "react";

type Result<T> = { key: string; ok: true; data: T } | { key: string; ok: false; status?: number };

/**
 * GET a JSON endpoint with explicit loading / error / data states, so a
 * failed request shows an error with Retry instead of loading forever.
 * `reload()` refetches; the previous data stays visible meanwhile, so
 * refreshing after an action doesn't flash a skeleton. Pass `null` to skip.
 */
export function useApi<T>(url: string | null) {
  const [attempt, setAttempt] = useState(0);
  const key = url ? `${url}#${attempt}` : null;
  const [result, setResult] = useState<Result<T> | null>(null);
  const [lastData, setLastData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!url || !key) return;
    let live = true;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw Object.assign(new Error(`${url} → ${r.status}`), { status: r.status });
        return r.json() as Promise<T>;
      })
      .then((data) => { if (live) { setResult({ key, ok: true, data }); setLastData(data); } })
      .catch((e: { status?: number }) => { if (live) setResult({ key, ok: false, status: e.status }); });
    return () => { live = false; };
  }, [url, key]);

  const current = result && result.key === key ? result : null;
  const data = current?.ok ? current.data : current ? undefined : lastData;
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return {
    data,
    loading: !!url && !current && data === undefined,
    error: current && !current.ok ? { status: current.status } : null,
    reload,
  };
}
