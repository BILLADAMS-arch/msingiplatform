# Msingi UX improvement plan

Date: 2026-10-06. Companion to `competitive-ux-audit.md`. Ranked by learner impact. Everything marked **[this round]** is implemented in this change set; the rest is deliberately deferred.

Guardrails for every item: no database change, no API contract change, no route change, no new fake data. Every number shown comes from data the app already returns.

## P0 — critical UX

### P0-1. Learn: make the curriculum a journey **[this round]**
- **Current problem:** a tall decorative banner and five floating thumbnails push the roadmap below the fold on phones; the roadmap is a wrapped cloud of pill buttons with no mastery bar; topics with no lesson look "locked" although some have practice questions; there is no "practise" action; six hero images (~495 KB) are downloaded on every visit even though five are hidden on small screens.
- **Reference observation:** both competitors make the subject → resource path the centre of the screen and keep resource types as first-class actions.
- **Proposal:** compact header (subject, grade, overall mastery, a "Continue" button to the learner's next topic); roadmap as a vertical list of topic cards: step number, status (Not started / In progress / Strong / Coming soon), mastery bar, one primary action (Start lesson / Continue / Review), secondary actions (Practise, Flashcards). No lock icons; "Coming soon" for topics with nothing yet.
- **Files:** `src/app/learn/page.tsx`.
- **Backend impact:** none. **Database impact:** none.
- **Risk:** low (same data, same links).
- **Benefit:** learners see where they are and what to do next in one glance; ~410 KB less image data on phones.

## P1 — high impact

### P1-1. Mistake Book → "your revision coach" **[this round]**
- **Current problem:** a flat chronological list; no summary; no sense of which topic is weakest; one action per card; 36 px buttons.
- **Observation:** SOMA's stated principle that missed topics keep coming back until they stick.
- **Proposal:** a summary ("N questions to master across M topics", weakest topic by real count), then groups per topic with a primary "Practise <topic>" action and an "Ask Msingi" link, then the individual cards. Keep "Mark as mastered" and "Ask Msingi why". Larger tap targets. Retest nudge linking to Tests.
- **Files:** `src/app/mistakes/page.tsx`.
- **Backend/DB impact:** none (`/api/mistakes` already returns `topicId`).
- **Risk:** low. **Benefit:** turns a list of failures into a revision plan.

### P1-2. Flashcards: close the loop at the end of a deck **[this round]**
- **Current problem:** "Deck Complete!" with only "Review Again"; the learner's ratings are not summarised; no next step.
- **Proposal:** summary from this session's ratings (easy / review later / difficult), a "Review the difficult cards" action (only when there are some), "Practise <topic>" and "Back to Learn".
- **Files:** `src/app/flashcards/page.tsx`. **Backend/DB impact:** none. **Risk:** low.

### P1-3. Faster pages: properly sized logos **[this round]**
- **Current problem:** the navigation logo is a 1197×767, 549 KB image shown at 44 px on every signed-in page; the login/landing logo is 864 KB shown at 56–96 px.
- **Proposal:** add small copies of Msingi's own logo (same artwork, 256 px) and point the UI at them; keep the originals.
- **Files:** new `public/logo-icon-sm.png`, `public/logo-full-sm.png`; references in shell, landing, login, forgot/reset password, Ask Msingi, admin shell.
- **Backend/DB impact:** none. **Risk:** very low. **Benefit:** ~1.4 MB less on first visits.

### P1-4. Accessibility: text contrast **[this round]**
- **Problem:** `--muted` (#98A2B3) is used for 11 px text (about 2.6:1 on white, below WCAG AA 4.5:1).
- **Proposal:** use `--ink-soft` (#667085) for text; keep `--muted` for decorative icons.
- **Files:** `src/app/ai/page.tsx`, `src/app/page.tsx`. **Impact:** none beyond styling. **Risk:** very low.

### P1-5. Dashboard when a grade has no published lessons
- **Problem:** the first card is "No lessons for your grade yet" even for learners with real progress elsewhere.
- **Proposal:** continue from the learner's own in-progress topic (already in `/api/progress/me`, including `lessonId`).
- **Needs a product decision** (cross-grade continuation). **Backend/DB:** none. **Risk:** medium (cross-grade expectations). Deferred.

### P1-6. Lesson continuity and expectations **[this round, from the signed-in review]**
- **Problem:** the lesson-complete screen had no "next lesson" and the lesson header gave no sense of length.
- **Observation:** Celebra's lessons show "N min read · N sections" and end with Previous/Next topic.
- **Change:** lesson header shows parts and a reading time computed from the real text; the completion screen adds "Next lesson: <topic>" using the subject's real roadmap order (Practise stays the primary action).
- **Files:** `src/app/learn/lesson/[lessonId]/page.tsx`. **Backend/DB:** none (existing roadmap API). **Risk:** low.

### P1-7. No more silent spinners **[this round, from the signed-in review]**
- **Problem:** SOMA's placement screen showed it is easy to trap a learner on an endless loader. Msingi's loaders had no slow-load message.
- **Change:** `LoadingState` shows "This is taking longer than usual. Check your connection — it will keep trying." after 10 s.
- **Files:** `src/components/ui.tsx`. **Backend/DB:** none. **Risk:** very low.

## P2 — polish

- P2-0. Placement check at sign-up (SOMA): a short diagnostic that picks the starting topics. Needs question coverage that does not exist yet for most grades.
- P2-1. Test results: show a short "what changed since last attempt" line (data exists: `previousScore`).
- P2-2. Lesson: estimated reading time per section (computable from text length, no new data).
- P2-3. Practice: celebrate a topic reaching the "Strong" band when it happens (derive from existing mastery).
- P2-4. Teacher/parent/admin pages: replace plain "Loading…" with skeletons and retry (already recorded in follow-ups).
- P2-5. A visible "skip to content" link for keyboard users.
- P2-6. Flashcard decks ordered by learner status (difficult first). UI-only; needs care not to change progress semantics.

## P3 — future

- Use the learner's stated goal to adapt dashboard wording.
- CBC performance bands (EE/ME/AE/BE) on results, once the official definitions are confirmed from KICD/KNEC.
- Kiswahili support in Ask Msingi (product and quality decision).
- A study-plan feature (SOMA claims one); only if learner research shows demand.
- Past papers (needs a rights-cleared source first).
- Live quizzes (SOMA): a large social feature; not justified yet.

## Explicitly not done

Live quizzes, audio lessons, ambassadors/referrals, weekly parent emails, extra animation, new gamification. None is backed by existing learner data or is needed for the core loop (Learn → Practise → Test → Analyse → Revise → Retest → Master).
