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

## What's implemented (Phase 2 — Engagement)

- **Streaks** are real: `touchStreak()` (`src/lib/gamification.ts`) compares calendar
  days between activity and increments/resets accordingly, called from every activity
  endpoint (lesson complete, practice, test submit).
- **Achievements**: all 7 catalog entries have real unlock logic (7-day streak, 100
  questions answered, perfect score, Mathematics mastery ≥80%, any topic mastery ≥90%,
  big score improvement, first 100%) — `unlockAchievement()` in the same file.
- **Daily Challenges**: "answer N practice questions in a row without a mistake,"
  resets automatically by UTC date, +100 XP on completion — `daily_challenge_progress`
  table, `GET /api/challenges/today`, a dashboard card.
- **Flashcards**: real spaced-review UI (`/flashcards?topic=`) — flip, Easy/Difficult/
  Review Later, Shuffle — backed by `flashcards`/`flashcard_progress` tables.
- **Library**: `/library` page with grade/subject/topic/type/difficulty filters and
  bookmarks (the previously-unused `bookmarks` table), on top of Supabase Storage.

## What's implemented (Admin CMS)

A real content-management console at `/admin` (ADMIN role only) — Users (role changes,
kept in sync between `public.users` and the Supabase Auth user's `app_metadata`),
Curriculum (Subjects/Strands/Sub-strands/Topics, tree-browser CRUD), Lessons (sections +
quick check editor, publish/draft), Questions (editor + a JSON bulk-import), Tests
(metadata + a question-picker with reordering, publish/draft), Resources (list/publish/
delete on top of the existing upload endpoint), Playground activities (catalog CRUD),
and a light Analytics view (user/content counts, most-difficult-topics, most-popular-
subjects). Curriculum content no longer requires touching application code or the seed
script — verified by authoring a full lesson → questions → test for the previously-empty
"Algebra" topic through the CMS API and confirming a student session could see, complete,
and score it through the ordinary student UI.

Grades are intentionally read-only (fixed CBC structure); question types are scoped to
`multiple_choice`/`true_false` (the only types the student UI can render — see
"Not yet built"); there's no content versioning, CSV import, or admin Settings page.

## What's implemented (real content, Msingi AI)

- **De-hardcoded student UI**: `/learn` and `/tests` no longer assume "Mathematics" —
  `/learn` has a real subject picker (any subject the CMS has content for), `/tests`
  lists tests across every subject in the learner's grade, the lesson → practice handoff
  uses the lesson's actual topic, and the test intro screen shows each test's real
  title/topics/question count/timing instead of fixed copy. The dashboard's "Continue
  Learning" card picks a real in-progress-or-next topic across all of a learner's
  subjects (weakest topic in progress, falling back to the first not-yet-started one).
- **Msingi AI** (spec §34) — a tutor chat at `/ai`, streamed, backed by the Groq API
  (`groq-sdk`, model `openai/gpt-oss-120b`) rather than Anthropic — a deliberate choice
  made when building this feature, not the original spec's default. System prompt
  (`src/lib/ai/tutor.ts`) instructs it to explain/hint/give examples rather than hand
  over answers outright. Conversations persist in the previously-unused
  `aiConversations`/`aiMessages` tables. The one grounded entry point: an "Ask Msingi AI"
  button on each Mistake Book card feeds the tutor the *actual* question/chosen/correct/
  explanation for that mistake, so "why is my answer wrong" is answered from real data,
  not guessed. Needs `GROQ_API_KEY` in `.env` (console.groq.com) — verified live:
  streamed responses, mistake-grounded answers, and persisted history across reloads.

## What's implemented (Msingi Playground)

4 genuinely interactive activities at `/playground` (spec §24–27), not placeholders —
**Fraction Explorer** (Math — ties to the seeded Fractions topic), **Algebra Balance**
(Math — ties to the Algebra topic authored through the Admin CMS), **Solar System
Explorer** (Science — real astronomy facts), and **HTML Playground** (Computer — live
code editor + sandboxed `<iframe sandbox="allow-scripts">` preview, deliberately without
`allow-same-origin` so student-typed code can't reach Msingi's own cookies or APIs).
`playgroundActivities` gained a `slug` column (developer-set only, via seed data) mapping
a catalog row to a real component in `src/components/playground/registry.ts` — an
activity only becomes clickable when both `enabled` and a recognized `slug` are true, so
the catalog can honestly list not-yet-built ideas (Number Line, Geometry Lab, States of
Matter, all of Language) as "Coming soon" without ever linking to nothing. Spec §29 lists
Playground as an XP source — a new `playgroundActivityProgress` table + `awardXp()`
(`src/lib/gamification.ts`) grants +15 XP once per activity, verified live to fire
exactly once.

## What's implemented (Teacher & Parent dashboards)

**Teacher** (`/teacher`, TEACHER/ADMIN): create classes, manage rosters by student
email, assign an existing published test to a class (new `assignments` table — closes a
gap in the spec's own §40 entity list, never added until now) with per-student
completion tracking, and a class performance view (average mastery, most-difficult
topics, students improving vs needing support — all computed from real
`subjectProgress`/`topicProgress`/`testAttempts` data). Also fixed a real pre-existing
bug: `POST /api/admin/resources` already declared `requireRole(["TEACHER","ADMIN"])` but
`src/proxy.ts`'s `/api/admin` rule blocked TEACHER before the route ever ran — a
higher-priority `/api/admin/resources` proxy rule now makes that reachable, verified
live (a TEACHER request now reaches the handler instead of being blocked at 403).

**Parent** (`/parent`, PARENT/ADMIN): link a child by email, see a strictly read-only,
aggregate-only summary (mastery, streak, XP, recent test scores) — deliberately never
`mistakes`/`testAnswers` (question/answer detail), matching the spec's explicit privacy
instruction. Ownership is enforced server-side, verified live: an unrelated parent
account gets a 403 trying to view a child they haven't linked.

Neither area has a consent/approval step (a teacher or parent can link any existing
STUDENT account by email alone) — a real product needs one; flagged as a follow-up
rather than built now.

## What's implemented (content breadth, question types, adaptive practice)

A second real subject — **Grade 7 Integrated Science → Human Nutrition → Classes of
Nutrients**, authored end-to-end through the Admin CMS (strand → sub-strand → 2 topics →
a full lesson with sections/quick-check → 8 real questions → a published test) — proving
the CMS produces real, working, student-visible content for more than just Mathematics.
Practice questions are also now genuinely adaptive: `GET /api/practice` weights which
difficulty tier appears more often based on the learner's current mastery of that topic
(weak → mostly easy, strong → mostly hard) — a real nudge, not a full IRT engine, and
explicitly scoped that way.

Two more question types are fully wired end-to-end — authoring (Admin question editor),
grading (`src/lib/grading.ts`, shared by Practice and Tests), student UI (text/number
input instead of option buttons), and the Mistake Book (`mistakes`/`test_answers` gained
a `chosen_text` column since these types have no option row to point at):
- **short_answer** — matched case-insensitively/trimmed against `|`-separated accepted
  variants.
- **numerical** — matched against a target value ± tolerance.

`matching`/`ordering` (2 of the schema's 7 `question_type` values) remain unbuilt — real
UI investment with lower value than the two above, deferred rather than faked.

## What's implemented (Profile, notifications, leaderboard, charts, search)

- **Profile** (`/profile`): edit name/goal, change password (`supabase.auth.updateUser`),
  leaderboard opt-out toggle, achievement shelf, sign out. Header avatar now links here
  instead of signing out directly.
- **Password reset**: `/forgot-password` → `supabase.auth.resetPasswordForEmail` →
  emailed link → `/reset-password` → `updateUser({ password })`. Needs the redirect URL
  allow-listed in the Supabase project's Auth settings for non-localhost deployments.
- **Notifications**: the `notifications` table is no longer just scaffolding —
  `src/lib/notify.ts` writes real rows at real trigger points (achievement unlocked,
  every 7-day streak milestone, a new class assignment), surfaced via a bell in the
  header (`src/components/notification-bell.tsx`) with unread badge + mark-read/mark-all.
- **Leaderboard** (`/leaderboard`): all-time XP ranking within the learner's own grade,
  respecting `leaderboardOptOut`, display name only (no email, no per-question data).
  Explicitly **not** time-windowed (weekly/monthly) — that needs XP-history tracking the
  schema doesn't have; an honest all-time ranking instead of a fake "weekly" label.
- **Charts** (`src/components/charts.tsx`): a bar chart and line chart, pure inline SVG,
  no charting dependency — Subject Mastery + Score Trend on `/progress`, Most Difficult
  Topics on `/admin/analytics`.
- **Global search** (`/search`): lessons, topics, published resources/tests, and
  flashcards by title. Deliberately excludes `questions` — searching question text would
  let students search up test/practice content.

## What's implemented (Msingi Playground — all 4 domains)

All 8 catalog activities are now real (`playgroundActivities.slug` maps every one to a
built component) — **Number Line**, **Geometry Lab** (live area/perimeter), and
**States of Matter** (Math/Science) join the earlier 4, plus a first Language Playground
activity, **Vocabulary Challenge** — an English/Kiswahili word-unscramble game using
real CBC Kiswahili subject-area vocabulary (msamiati, sarufi, methali, nahau, ufahamu)
as content, not placeholders. Every catalog row is real now — nothing left in "Coming
soon."

## Not yet built

Matching/ordering question types, CSV import and content versioning for the Admin CMS,
consent/approval flows for teacher-adds-student and parent-links-child (currently
email-only), a teacher-specific test/challenge authoring surface distinct from the Admin
CMS, and a full accessibility (ARIA/keyboard-nav/contrast) audit. See "Suggested next
steps" below.

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
GROQ_API_KEY=""   # powers Msingi AI — get one at console.groq.com
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
    schema.ts        # Drizzle schema — single source of truth for all 33 tables
    index.ts          # DB client (pg Pool, pooled Supabase connection)
    seed.ts            # Seeds grades/subjects/curriculum/questions/achievements
  proxy.ts             # Role-based route protection (Next 16's renamed middleware.ts)
  lib/
    api-guard.ts       # requireRole() helper for API routes
    gamification.ts     # touchStreak/awardXp/unlockAchievement/recordQuestionAnswered
    supabase/
      client.ts         # Browser client (login/register/sign-out)
      server.ts          # Server client bound to cookies (Route Handlers, RSC)
      admin.ts            # Service-role client (admin.createUser, Storage uploads)
      middleware.ts        # updateSession() used by proxy.ts
      storage.ts            # Resource file upload/public URL/delete helpers
  app/
    api/               # Student-facing routes: auth, curriculum, lessons, practice,
                          tests, progress, mistakes, profile, resources, challenges,
                          flashcards, playground, ai
    api/admin/         # Admin CMS routes: users, subjects/strands/sub-strands/topics,
                          lessons, questions(+import), tests, resources, playground, stats
    api/teacher/       # Classes, roster, assignments, class dashboard (TEACHER/ADMIN)
    api/parent/        # Linked children + read-only progress (PARENT/ADMIN)
    (student pages)    # register, login, dashboard, learn, practice, tests, progress,
                          mistakes, playground/[slug], flashcards, library, ai
    admin/             # Admin console pages (ADMIN role only), mirrors api/admin/
    teacher/           # Class list + class detail (roster/performance/assignments)
    parent/            # Linked-children progress dashboard
  components/
    ui.tsx             # Pill, FoundationBar, StatCard, TopicChip
    shell.tsx           # Authenticated student app shell + nav
    admin-shell.tsx      # Admin console shell + nav
    admin/               # Shared admin form components (e.g. question-form.tsx)
    playground/          # The 4 real activities + registry.ts (slug -> component)
```

## Suggested next steps

- **Content breadth, continued**: Grade 7 Mathematics and a slice of Integrated Science
  are real; English, Kiswahili, Social Studies, Pre-Technical Studies, Agriculture, ICT,
  and Business Studies are still bare subject rows. The CMS pattern used for both real
  subjects (author strand → sub-strand → topics → lesson → questions → test, then
  publish) is the template — it's now proven to work, just needs repeating.
- **Matching/ordering question types**, a teacher-specific content-authoring surface,
  CSV import + content versioning for the Admin CMS.
- **Consent flows** for teacher-adds-student and parent-links-child (currently
  email-only, no approval step).
- **Weekly/monthly leaderboard windows** (needs XP-history tracking; the current
  leaderboard is an honest all-time ranking instead).
- **Accessibility audit** (ARIA labels, keyboard navigation, contrast) — not yet done at
  any stage of this build.
