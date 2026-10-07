# Msingi — competitive UX audit (SOMA, Celebra)

Date: 2026-10-06. Scope: product and UX quality only. Syllabus sourcing, curriculum imports and payments are out of scope here.

## How this audit was done, and its limits

- **SOMA** (`soma.ke`): I read the public landing page, sign-in page and navigation as text. The in-app browser refused `soma.ke`, so I could not see SOMA visually, and its signed-in product (dashboard, lessons, practice, tests) is not public. **Everything in the SOMA column is what SOMA publicly says its product does**, not something I used.
- **Celebra** (`learning.celebra.school`): I read its public marketing page, its embedded metadata and its sign-in portal earlier in this project. The learner area is behind sign-in (not accessed), and the browser pane refused Celebra in this session. **The Celebra column is likewise public claims and the sign-in/marketing surfaces only.**
- **Msingi:** the audit is based on reading the actual code of every learner page and shared component, plus the screens I tested on production earlier in this project (desktop, 375 px, tablet). The production browser session was lost when the pane's tab was recreated, so I did not re-screenshot every signed-in page for this report.
- Nothing from either competitor (text, assets, code, branding, questions) was copied. This report records patterns and principles only.

## What the competitors appear to do well (principles, not designs)

| # | Principle | Evidence (public) |
|---|---|---|
| 1 | **One clear job per screen, and a next step after every action.** | SOMA: "Choose your path" / "Start free"; weak-spot topics "come back until they stick". Celebra: learner flow named around Notes → Videos → Flashcards → Practice → Questions → Papers. |
| 2 | **Honest, specific marking feedback.** | SOMA says it marks "step by step", with method and accuracy marks and where marks were lost. |
| 3 | **Habit loops built from real behaviour.** | SOMA: streak counter, live quizzes against a grade, weekly parent reports. Celebra: "Saturday challenge" style gamification. |
| 4 | **Personal planning.** | SOMA: weekly study plan from available evenings, weighted to weak subjects. |
| 5 | **Mobile and low-data first.** | SOMA: Android app, offline audio downloads, a 32-bit build; Celebra: web + mobile app on the same backend. |
| 6 | **Plain, confident language and a single accent colour.** | Both pages lead with the learner's goal, not features. |
| 7 | **Resource types are first-class tabs on a subject** (notes, flashcards, practice, past papers). | Celebra's sitemap: four resource pages per subject. |
| 8 | **Local context.** | KES pricing, M-Pesa messaging, English/Kiswahili AI. |

Msingi should adopt the **principles** (1, 2, 3, 5), not the features (live quizzes, audio, study planners, ambassadors) — those are not justified by Msingi's current learner data.

## Gap analysis

Legend for the competitor columns: "claims" = stated publicly, not seen in use.

| Area | Msingi (today) | SOMA | Celebra | Best approach | Recommended Msingi change |
|---|---|---|---|---|---|
| Landing | Clear hero, 4-step loop, dashboard preview. Logo images are oversized (549 KB / 864 KB for a 44–96 px mark). | Goal-led headline, "choose your path", free-start messaging | Search-led SEO page; feature list | Goal-led, fast page | Keep content; ship properly sized logos (faster first paint on phones). |
| Onboarding | 3-step wizard (details → grade from DB → goal). Goal is stored but never used afterwards. | Learner self-segments by goal ("where are you headed?") | School vs community sign-in split | Short, then immediately useful | Keep. Later: use the stored goal to shape dashboard wording (P3). |
| Dashboard | Strong: continue card, snapshot, focus areas, recommended next, subjects, recent tests. For grades with no published lessons, the first card is an empty state. | Streak and CBC level surfaced; study plan | Dashboard behind sign-in | One obvious next action in seconds | Already good. Plan: surface the learner's own in-progress topic when their grade has no lessons (needs a product decision). |
| Navigation | Desktop sidebar + mobile bottom bar + More sheet; active states; subject links by id. | Top nav by audience | Tabs: Notes, Videos, Flashcards, Practice, Questions, Papers | Task-based tabs | Fine. Keep. |
| Learning discovery | Learn page: a large decorative banner with five floating thumbnails, then a wrapped cloud of pill buttons. No mastery bar, no practise action; topics without a lesson show a lock icon. Six hero images (≈495 KB) load on phones. | Paths and exam tracks | Strands/sub-strands (claimed) | The curriculum as a journey with status | **Rebuild the roadmap as a journey of topic cards** (status, mastery bar, one primary action, quiet secondary actions); remove the five hidden thumbnails. |
| Subject selection | Pill row of subjects, accent colour per subject. | Path cards | Subject cards (UUID subject pages) | Cards with progress | Keep pills; show the active subject's mastery prominently. |
| Lesson experience | Step-by-step sections, progress bar, quick check, completion screen with "Practise <topic>". | Concept check before advancing | Notes + video | Focused steps + clear next step | Already strong; minor polish only. |
| Practice | Setup (5/10/20), instant feedback, explanation, completion ring, review/test links. | Step-by-step marking claims | Auto-marked practice | Instant, specific feedback | Already good. |
| Tests | Intro, timer, question navigator, submission claim, results with topic breakdown and "practise weakest". | Timed mocks | Past papers and exam practice | Clear results → revise path | Already good (phase 5). |
| Results | Score ring, by-topic accuracy, what to do next. | Marks lost per step | Band reporting claim | Show what to revise | Good. Later: CBC performance bands only once the official definitions are confirmed. |
| Progress | Level, streak, focus areas by mastery, subjects, history, revision summary. | CBC levels per subject | Report-card portal | Mastery by band | Good. |
| **Mistakes** | A flat chronological list of every wrong answer. No summary, no grouping, no topic-level action. Buttons are 36 px high. | "Topics you got wrong come back" | — | A revision coach | **Rebuild as a "revision coach"**: summary, grouped by topic with a Practise action per topic, then individual questions. All numbers from real mistakes. |
| Flashcards | Flip card + difficult/later/easy. End screen "Deck Complete!" is a dead end. | — | Flashcards are a core tab | Close the loop | **End-of-deck summary from this session's ratings**, "review difficult cards", and next steps (Practise this topic, back to Learn). |
| AI tutor | Context from lesson/mistake/topic, starter prompts based on real weakest topic, quota shown, follow-up chips. | Typed/spoken/photo, English + Kiswahili | "Shupavu" assistant (claims) | Contextual and personal | Already integrated. Later: Kiswahili support (product decision). |
| Gamification | Real XP, streak, 7 real achievements, daily challenge. | Streaks, live quizzes | Challenges | Only real learner actions | Keep as is. Do not add. |
| Empty states | Present on learner pages (phase 8); teacher/parent/admin still plain "Loading…". | — | — | Explain + act | Flashcards and Mistakes empty states improved in this round. |
| Loading states | Skeletons on learner pages. | — | "Loading content 0%" gating | Skeletons | Fine. |
| Error states | Retry states on learner pages. | — | — | Retry | Fine. |
| Mobile UX | No overflow at 375/768 on tested pages; bottom nav; 44 px+ targets mostly. Learn banner is tall on phones. Mistakes buttons 36 px. | App-first | App-first | No overflow, big targets | Compact Learn header; raise Mistakes tap targets. |
| Accessibility | Focus rings, reduced-motion support, ARIA on states. **`--muted` (#98A2B3 on white ≈ 2.6:1) is used for 11 px text** in several places (fails WCAG AA). | — | — | AA contrast | Use `--ink-soft` for text; keep `--muted` for decorative icons only. |
| Visual hierarchy | Consistent tokens, cards, pills. Learn and Mistakes are the least consistent pages. | Clean, single accent | Dense | Consistent cards | Bring Learn/Mistakes/Flashcards-end onto the shared Card/Button/Pill set. |
| Motivation | Streak, XP, focus areas, recommendations. | Weekly parent reports, live quizzes | Challenges | Real progress made visible | Make mastery visible on the Learn journey (new). |
| Personalization | Recommendations from real weak topics; profile goal unused. | Study plan, weak-spot review | CBC bands per learner | Use real data | Journey cards and mistake groups are personalised from real data. Goal-based wording is P3. |


## Addendum — signed-in observations (2026-10-06, using the owner's own sessions)

Read-only. I viewed pages only: no content was copied, no tests or sessions were started, and nothing was submitted. Side effect to disclose: opening one Celebra notes page credited the owner's Celebra account with 2 XP and a 1-day streak.

### SOMA (`soma.ke`, signed in)
- Requesting `/dashboard/senior` redirected to a **placement test** page that never finished loading. The page's own calls failed (placement API 500, streak API 401, React hydration errors), and the screen showed "Loading your placement test…" with **no timeout, error or retry**. The dashboard was not reachable.
- Takeaways: (a) a short **placement check** that personalises the start is a strong onboarding idea; (b) a first-run gate **must never be able to trap a learner on a spinner**. Every loading state needs a slow-load message and an escape.
- Other signed-in pages were not reachable (one guessed URL returned 404); I did not probe further.
- **Reproduced in a second, independent browser (Brave, via the Claude extension, same account):** `/dashboard/senior` again redirected to `/placement` and stuck on the loader. Network log: `GET /api/placement` → 500, `GET/POST /api/streak` → 401, plus React hydration errors #418/#423/#425; `/api/profile` and `/api/study-content?grade_band=senior` returned 200. So the failure is on SOMA's side for this account, not an artefact of the earlier browser. I did not try to skip or work around the placement step.

### Celebra (`learning.celebra.school/community/dashboard`, signed in)
What works (principles):
- **Mode-based study navigation:** Notes / Videos / Flashcards / Practice / Questions / Papers, plus a level → grade → subject drill-down with age ranges and subject counts.
- **Subject page as an outline + content pane:** numbered strands and sub-strands with a per-topic progress bar.
- **Lesson shape:** hero with grade chip, topic number and "N min read · N sections"; videos first; numbered note sections; a summary of key points; review questions; **Previous / Next topic**.
- **Dashboard motivation:** level and XP bar, streak, a weekly "Saturday challenge", grade/school leaderboard, adaptive recommendations triaged into Pick up / Active / Ignored / Mastered.

What does not work (avoid):
- Dashboard mixes learner tasks with billing, teacher-subscription rules and a marketing paragraph; it is very long.
- On a 390 px phone, four stat tiles stack at full width, pushing real actions several screens down; no bottom navigation; "1 days" grammar slip; 21 text elements under 11 px; 3 tap targets under 32 px.
- Opening a subject auto-selects the first topic even when its notes are unpublished, so the first thing a learner sees can be an empty panel.
- At one desktop width the layout scrolled sideways and clipped the left sidebar.
- Zero-value stat tiles with no guidance for a brand-new learner.
- Metadata and pricing contradict each other (see the Celebra audit).

Msingi comparison: Msingi's dashboard is shorter and action-led; its Learn roadmap now avoids landing on an empty topic. Gaps found: no **next lesson** continuity (added this round), no visible lesson length (added), and no slow-load message (added).
