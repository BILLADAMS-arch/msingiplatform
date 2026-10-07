# Topic Hub and dashboard motivation — implementation report

Date: 2026-10-06. Scope: Phase 1 (Topic Hub), Phase 2 (dashboard motivation), and only as much visual direction as those two needed (Phase 3). Out of scope and untouched: syllabus/curriculum correctness, M-Pesa/payments, imports, videos/audio/live quizzes, new backend features.

## 1. What was already present
- Topic data: `topics` → `sub_strands` → `strands` → `subjects` → `grades`; `topic_progress` (mastery, answers); `lessons` + `lesson_completions`; `questions`; `flashcards` + `flashcard_progress`; `mistakes` (open/mastered, by topic); `tests` + `test_questions` + `test_attempts`.
- APIs: `/api/curriculum/roadmap` (topic order, mastery, lesson id), `/api/progress/me`, `/api/mistakes`, `/api/flashcards?topicId=`, `/api/leaderboard`, `/api/challenges/today`.
- Routes: `/learn/lesson/[id]`, `/practice?topicId=`, `/flashcards?topicId=`, `/tests/[id]`, `/mistakes`.
- XP and levels: XP stored on `profiles`; level was a duplicated one-line rule (one level per 500 XP) in the progress and profile pages.
- Components: `Card`, `Button`, `Pill`, `FoundationBar`, `ProgressRing`, `Breadcrumbs`, loading/error/empty states; `bandFor`, `MASTERED`, `practiceHref`.
- There was no topic-level page and no read endpoint for lesson completion, flashcard counts, question counts, or "which tests cover this topic".

## 2. What was reused
Everything above. The hub's mastery number is the stored `topic_progress.mastery_pct`; no mastery rule was added or changed. The subject outline reuses `/api/curriculum/roadmap`. Links reuse the existing lesson, practice, flashcard, test and mistake routes.

## 3. What was added
- **`GET /api/topics/[topicId]`** (read-only, student-only): one call returning the topic's place, mastery, lesson status, question and flashcard counts, open mistakes, covering tests with the learner's latest score, and previous/next topic.
- **`/learn/topic/[topicId]`** — the Topic Hub: breadcrumb, mastery ring and band, a single "Next step" action with its reason, four learning modes (Lesson, Practise, Flashcards, Mistakes), a "Check what you know" section (practice plus covering tests with last score and Retest), previous/next topic, a progress card, and (large screens) the subject's topic outline.
- **`src/lib/topic-hub.ts`** — `nextAction()`, a pure function deciding the next step: (1) lesson not finished → continue/start lesson; (2) unresolved mistakes → review them; (3) mastery below Strong → practise; (4) Strong → retest a covering test (lowest or untaken first), else practise again; then flashcards, next topic, or "back to subject". A topic with nothing published says "Coming soon" instead of showing a dead button.
- **`src/lib/levels.ts`** — the existing level rule (500 XP per level) as one shared helper with `levelProgress()` (level, XP, XP to next level).
- **Dashboard:** the "Questions answered" and "XP earned" tiles became one compact **Level card** (level name and number, XP, bar, "N XP to next level", and "#N of M in your grade" only when the leaderboard has real data), plus a **"Your mastery"** list (up to three mastered topics, or the strongest so far) after Focus areas. Focus-area and mastery topic names link to the hub.
- **Entry points to the hub:** Learn topic titles, lesson-complete "Topic overview", Mistake Book topic headings, dashboard topic names.
- **Mistake Book `?topicId=` filter** (with "Back to topic" and "Show all"); used by the hub's "Review your mistakes".
- Small accessibility fix: breadcrumb link tap areas enlarged; dashboard link tap areas sized for touch.

## 4. Routes and components changed
New: `src/app/learn/topic/[topicId]/page.tsx`, `src/app/api/topics/[topicId]/route.ts`, `src/lib/topic-hub.ts`, `src/lib/levels.ts`.
Modified: `src/app/dashboard/page.tsx`, `src/app/learn/page.tsx`, `src/app/learn/lesson/[lessonId]/page.tsx`, `src/app/mistakes/page.tsx`, `src/app/progress/page.tsx` and `src/app/profile/page.tsx` (now import the shared level helper, same output), `src/components/ui.tsx` (breadcrumb tap area).
(Earlier UX work in this branch — Learn journey, flashcard completion, logo sizes, contrast, lesson length/next lesson — is covered in the other `reports/ux` files.)

## 5. APIs changed
One API **added** (`GET /api/topics/[topicId]`, read-only). No existing API, response shape or route was changed.

## 6. Database changes
**None.** No migration, no schema change, no data written. The new endpoint only reads existing tables.

## 7. Real data used
Mastery and answered counts (`topic_progress`); lesson completion; question, flashcard and mistake counts; flashcard review statuses; tests covering the topic and the learner's latest submitted score; topic order within the subject; XP; leaderboard rank (only shown with at least two real learners and not opted out). Nothing is estimated or invented: "Topic N of M" is the real position in the subject, not an official curriculum number.

## 8. Mobile verification (375, 390, 412 px)
Tested against a disposable local database holding a read-only copy of production content plus clearly-local test progress rows (deleted afterwards). Result: no horizontal overflow on the hub or dashboard at 375, 390 and 412; the hub's primary action sits at about y=381 on a 812 px screen (visible without scrolling); mode tiles stack full-width below 420 px; ring, bar and progress rows stay readable; zero interactive elements under 32 px on the pages changed (breadcrumb and link tap areas fixed after measurement); the dashboard keeps its priority order (Continue learning, then the Level card).

## 9. Desktop verification (768, 1280, 1440 px)
No overflow. At 768 the mode tiles are two columns; at 1280 and 1440 the hub is a two-column layout (main content, plus progress card and subject outline on the right). All hub states were exercised: lesson not done, open mistakes, low mastery, Strong with a covering test (Retest), nothing published ("Coming soon").

## 10. Functional checks
- `nextAction()` unit-tested across 13 branches (priority order, test selection, empty states): 13/13 pass.
- `levelProgress()` unit-tested at 0, 499, 500, 620, 2499, 2500, very large and negative XP, and against the old rule: 9/9 pass.
- Click-through: Learn → hub; hub → filtered Mistake Book → back; hub tiles carry the correct topic IDs; marking a mistake mastered and walking a flashcard deck still work; lesson completion, practice, tests, progress, Ask Msingi and profile pages load with no errors; the Level label matches on dashboard, progress and profile.
- Typecheck, lint and production build all pass.

## 11. Performance impact
The hub makes one API call (three short stages: place, then seven parallel reads, then latest attempts only if a test covers the topic) plus the existing roadmap call for the outline. The dashboard gains one small request (`/api/leaderboard`), which fails silently. No new large assets; earlier logo resizing already removed about 1.4 MB per first visit.

## 12. Accessibility checks
Single `h1` per page, `h2` per section, breadcrumb navigation, `aria-current` in the outline, labelled progress bars and ring, `dl` for progress rows, disabled tiles marked `aria-disabled` and explained in words ("Coming soon", "No questions yet"), visible focus from the existing focus ring, no colour-only status (every status has text), small text uses the darker grey token.

## 13. Remaining UX weaknesses
- **Lesson progress is binary:** Msingi records completion, not partial progress, so "Continue lesson" can't resume mid-lesson.
- **Topic numbering:** the hub says "Topic 2 of 6" (position in Msingi's ordering), not an official curriculum number.
- **Tests aren't topic-scoped:** a test that merely includes a few questions from a topic appears under that topic; retesting means the whole test.
- **Grades 6, 8, 9 have no topics yet**, so their learners won't see the hub at all (a content gap, not a UI one).
- **Daily challenge:** it already appears in "Recommended next"; the dashboard doesn't show it again, to avoid duplication.
- **The hub is light-only**; no dark mode yet.
- The hub has no "Ask Msingi about this topic" shortcut yet.

## 14. Recommended next visual-design phase
1. Topic-card and mastery visual language: a consistent mastery ring or gem used on Learn cards, hub, dashboard and progress.
2. Dark theme, defaulting to the device setting, with contrast checked.
3. Small, earned feedback moments (a topic reaching Strong; a level-up) driven only by real events.
4. An "Ask Msingi about this topic" action on the hub and a "what changed since last attempt" line on results.
5. Teacher, parent and admin pages brought up to the learner pages' loading/error standard.

## Git status
Branch `redesign/phase-8-qa-integrity` at `f488263`. Modified: the 15 source files listed above (plus earlier UX work). Untracked: `reports/`, `curriculum/research/`, `public/logo-*-sm.png`, `src/app/api/topics/`, `src/app/learn/topic/`, `src/lib/levels.ts`, `src/lib/topic-hub.ts`. Nothing committed or deployed.
