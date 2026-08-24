import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations run against Supabase's direct (non-pooled) connection when
    // available — the transaction pooler (DATABASE_URL) isn't suited to the
    // long-lived sessions drizzle-kit uses.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/msingi",
  },
});
