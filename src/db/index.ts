import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const isSupabase = /supabase\.(co|com)/.test(process.env.DATABASE_URL || "");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  // Opening a TLS connection to the remote pooler costs far more than a
  // query, and the pg default closes idle connections after 10s — i.e.
  // between most learner actions. Keep them warm for a minute instead.
  idleTimeoutMillis: 60_000,
  keepAlive: true,
});

export const db = drizzle(pool, { schema });
