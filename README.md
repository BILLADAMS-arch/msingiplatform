# Msingi — CBC Learning & Revision Platform

Learn. Practise. Grow.

A real, multi-user Kenyan CBC learning platform: Next.js 16 (App Router, TypeScript) +
Drizzle ORM + Supabase (Postgres, Auth, Storage). This is not a prototype — accounts,
curriculum, lessons, questions, tests, mistakes, mastery, XP, and achievements are all
real rows in Postgres, graded server-side.

## What's implemented (Phase 1 of the build plan)

- **Auth**: registration, login, role claims (STUDENT/TEACHER/PARENT/ADMIN), route-level +
  API-level role enforcement — via Supabase Auth. `auth.users` is the credential store;
  `public.users`/`public.profiles` (Drizzle-managed) hold the app's own identity/role/
  profile data, keyed by the same UUID. Role lives in the Supabase user's `app_metadata`,
  set at registration, so `src/proxy.ts` (Next 16's renamed `middleware.ts`) and
  `src/lib/api-guard.ts`'s `requireRole()` can check it without an extra DB round trip.
  Authorization itself is enforced entirely in Next.js API routes, not Postgres RLS —
  Drizzle connects with a direct Postgres connection, so RLS is never in the request path.
- **Curriculum**: Grade → Subject → Strand → Sub-strand → Topic → Lesson, fully
  data-driven, nothing hard-coded into components. Seeded: 14 grades (PP1–Grade 12),
  subjects for Grades 6–9, a full Grade 7 Mathematics roadmap (Numbers, Fractions,
  Decimals, Percentages, Ratios, Algebra) with real depth on Fractions (lesson + quick
  check + question bank).
- **Learning loop, end to end and server-graded**: lesson → quick check → practice
  (correct answers are never sent to the client until after grading — verified) →
  Standard Test (10 questions, timed, auto-marked server-side against the database) →
  results with per-topic breakdown → automatic remediation plan for any topic under 60% →
  retest → improvement comparison → XP + achievement unlocking. This exact flow was
  verified working end-to-end via curl against a live Postgres instance, not just
  typed/compiled — see "Verified working" below.
- **Mistake Book, Progress dashboard, achievements** — all reading real Postgres data,
  no localStorage.

## Not yet built

Teacher/Parent/Admin dashboards, resource library search/UI, interactive Playground
activities, and Msingi AI are scaffolded in the schema (see `src/db/schema.ts` —
`classes`, `playgroundActivities`, `aiConversations` etc. already exist as tables) but
don't have UI or full API routes yet. Resources are a partial exception: uploads go to
Supabase Storage via `POST /api/admin/resources` (teacher/admin) and
`GET /api/resources` lists them (any signed-in user) — there's no library page/search UI
yet. See "Suggested next steps" below for the recommended build order.

## One deviation from the original architecture plan

**Prisma → Drizzle ORM.** Prisma's query engine binaries download from
`binaries.prisma.sh` at install/generate time, which wasn't reachable from the sandbox
this was built in. Drizzle is pure TypeScript with no native binary dependency and gives
the same schema-as-code/migrations workflow — `src/db/schema.ts` is the single source of
truth, `npm run db:generate` produces SQL migrations, `npm run db:migrate` applies them.
If you have unrestricted network access and prefer Prisma, porting the schema back is
mechanical — the table and column shapes are the same, just expressed differently.

## Verified working

- `npm run build` — clean production build, zero TypeScript errors, `src/proxy.ts`
  correctly picked up as Next 16's Proxy (the renamed `middleware.js` convention).
- `npm run db:generate` — produces clean migrations against the current schema.

The curl walkthrough below (register → login → lesson → practice → test → remediation →
retest → mastery/XP/achievements) was verified end-to-end against a local Postgres +
NextAuth setup before this migration. It has **not** been re-run against a live Supabase
project — that needs real Supabase credentials (see below), which weren't available in
the environment this migration was built in. Re-verify this flow, plus a resource
upload/list round-trip, once you've connected a real project.

## Getting it running

### 1. Prerequisites
- Node.js 20+ (22+ recommended — `@supabase/supabase-js` warns on 20, see below)
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Configure environment
In your Supabase project: **Settings → Database** for the two connection strings,
**Settings → API** for the URL/keys, and **Storage** to create a bucket named
`learning-resources` (or set `SUPABASE_STORAGE_BUCKET` to whatever you name it — public
read access is enough since authorization is enforced in the app layer, not Storage RLS).

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL="postgresql://...supabase pooled connection (port 6543)..."
DIRECT_URL="postgresql://...supabase direct connection (port 5432), used for migrations..."
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""   # server-only — never expose to the client
SUPABASE_STORAGE_BUCKET="learning-resources"
ANTHROPIC_API_KEY=""   # only needed once Msingi AI (a later phase) is built
```

Append `?sslmode=no-verify` to both connection strings, not `sslmode=require`. Newer
versions of `pg`/`pg-connection-string` treat `require` (and `prefer`/`verify-ca`) as
aliases for `verify-full`, which checks the certificate chain against your local CA
store — Supabase's isn't in it, so `drizzle-kit migrate` and the app's `pg.Pool` both
fail with `self-signed certificate in certificate chain`. `no-verify` keeps the
connection encrypted without that check (`psql` uses standard libpq semantics, where
plain `require` already means this — the `no-verify` value is `pg`-specific).

### 3. Install, migrate, seed

```bash
npm install
npm run db:generate   # only needed if you change src/db/schema.ts
npm run db:migrate    # applies drizzle/*.sql to your database
npm run db:seed       # loads grades, Grade 7 Maths curriculum, questions, achievements
```

### 4. Run

```bash
npm run dev            # http://localhost:3000
# or for a production build:
npm run build && npm run start
```

### 5. Try the demonstration flow

1. Go to `/register`, create a student account for Grade 7.
2. `/learn` → open **Fractions** → read the lesson → answer the quick check.
3. You're routed to Practice — answer a handful of questions.
4. Go to `/tests`, start the **Standard Test** (Fractions/Ratios/Percentages, 10
   questions). Answer confidently on Fractions and guess on Ratios/Percentages to see the
   remediation path — anything under 60% triggers "Let's improve this" with a generated
   revision plan instead of a bare failure.
5. Follow the revision plan, retake the test, and watch score improvement, XP, and
   achievement unlocks reflect on `/progress`.

## Project structure

```
src/
  db/
    schema.ts        # Drizzle schema — single source of truth for all 30 tables
    index.ts          # DB client (pg Pool, pooled Supabase connection)
    seed.ts            # Seeds grades/subjects/curriculum/questions/achievements
  proxy.ts             # Role-based route protection (Next 16's renamed middleware.ts)
  lib/
    api-guard.ts       # requireRole() helper for API routes
    supabase/
      client.ts         # Browser client (login/register/sign-out)
      server.ts          # Server client bound to cookies (Route Handlers, RSC)
      admin.ts            # Service-role client (admin.createUser, Storage uploads)
      middleware.ts        # updateSession() used by proxy.ts
      storage.ts            # Resource file upload/public URL/delete helpers
  app/
    api/               # All backend routes: auth, curriculum, lessons, practice, tests,
                          progress, mistakes, profile, resources, admin/resources
    (pages)            # register, login, dashboard, learn, practice, tests, progress,
                          mistakes, playground
  components/
    ui.tsx             # Pill, FoundationBar, StatCard, TopicChip
    shell.tsx           # Authenticated app shell + nav
```

## Suggested next steps

- **Teacher**: classes, assignments, resource upload, class analytics
- **Parent**: read-only child summaries — privacy-scoped, no raw answer-level data
- **Admin CMS**: full curriculum/question/test CRUD + publishing workflow
- **Msingi AI tutor**: server-side only, via the Anthropic API, plus adaptive
  practice/testing logic
- **Notifications, opt-in leaderboards, search indexing**
