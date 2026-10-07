# Celebra Learning — curriculum audit (research only)

Date: 2026-10-06. Scope: what a signed-out visitor can legitimately see of Celebra Learning (`https://learning.celebra.school/e-learning`) and its parent site (`celebra.school`). **Nothing was copied, scraped, downloaded or imported, and no database was touched.**

## Headline

**Celebra's curriculum structure is not publicly accessible.** Every learner page (`/subjects`, individual subject pages, `/revision-notes`) redirects a signed-out visitor to a sign-in screen (`…?loginRequired=true`). I did not sign in, create an account, or request any of the site's API or build paths (its `robots.txt` disallows `/api/` and `/_next/` for all crawlers). So the Grade 6–9 Mathematics and Integrated Science structures you asked me to inspect **could not be verified**. This report says so rather than guessing.

What can be said from public pages is limited to Celebra's *claims* ("KICD aligned", "CBC aligned"), its legal terms, and a few structural hints from its sitemap and embedded metadata.

Method note: the marketing and legal pages were read through an automated page-to-text step, so quotation marks below mark wording as returned by that step. Re-check the live page before quoting any of it externally. The public `/e-learning` page text and its embedded JSON-LD were read directly.

## A. Platform overview

- **Product:** "Celebra Learners" / "Celebra Learning" (`learning.celebra.school`), the learner side of **Celebra** (`celebra.school`), which also sells a school-management system / ERP and an LMS.
- **Legal entity:** Celebra Education Limited (Terms and Privacy "Last Updated January 5, 2026", Kenyan law). The parent site names "Teddydan" as the developer.
- **Features claimed:** revision notes, study videos, flashcards, exam practice, past papers, exam questions, Virtual Lab, auto-marking ("Smart Mark"), KPSEA mock exams, "Shupavu" AI study assistant (Swahili/English), "Njia" career-pathway discovery (Grade 9), web and mobile apps.
- **Price:** pricing page lists Individual KSh 500/month (regular 750), School Student KSh 150/month (regular 350), Premium "coming soon", and mentions no free content. **Contradiction:** the page's embedded metadata says `price: 0` / `isAccessibleForFree: true`.
- **Coverage claimed:** "PP1–Grade 12" (pricing page, embedded metadata); the e-learning page text speaks of Grades 4–9 revision and KPSEA.

## B. Curriculum hierarchy

**Not verifiable.** Celebra says learners "study through structured CBC strands, sub-strands" and that its notes cover "all CBC strands and sub-strands", but no strand, sub-strand, topic or lesson name is publicly visible.

What the public evidence does show:

- **Sitemap** (`/sitemap.xml`, advertised in `robots.txt`; 1,637 URLs, last modified 2026-08-20 to 2026-10-01): **232 subject pages**, each keyed by a UUID and each with four resource sub-pages: `/flashcards`, `/exam-practice`, `/past-papers`, `/exam-questions`. There are no per-topic or per-lesson URLs in the sitemap. Top-level pages: `/subjects`, `/revision-notes`, `/flashcards`, `/past-papers`, `/exam-practice`, `/exam-questions`, `/revision-questions`, `/study`, plus `/njia` career pages.
- **Embedded metadata (JSON-LD) on `/e-learning`:** `educationalLevel` = Pre-Primary (PP1–PP2), Lower Primary (Grade 1–3), Upper Primary (Grade 4–6), Junior Secondary (Grade 7–9), Senior Secondary (Grade 10–12). `teaches` = CBC English, Mathematics, Kiswahili, Science and Technology, Social Studies, Religious Education. Four generic "courses": Revision Notes, Flashcards, Exam Practice, Past Papers (all labelled "Primary School"). No strand data.
- **Observation, not a finding:** 232 subject records is the same order of magnitude as the 220 KICD design documents, which would be consistent with one subject record per grade-subject. That is an inference from a count only.

So the only hierarchy that can be stated is: **level band → (232 UUID-keyed subject pages) → four resource types**. The levels below subject (strand / sub-strand / topic / lesson) are not publicly visible.

## C. Grade coverage (public)

Claimed: PP1–Grade 12. Publicly confirmed: the five level bands above. Which grades actually have content cannot be checked without signing in.

## D. Subject coverage (public)

- Embedded metadata `teaches`: English, Mathematics, Kiswahili, Science and Technology, Social Studies, Religious Education.
- Parent site `/cbc` lists eight areas: Mathematics, English, Kiswahili, Science & Technology, Social Studies, Creative Arts, Physical Education, Religious Education. This generic primary-style list omits Integrated Science and the other Junior School learning areas, so it is not evidence of Junior School structure.
- The parent site's study-videos filters list secondary subjects (Physics, Chemistry, Biology, History, Geography, Computer Science, Business Studies, etc.) and three senior pathways (STEM, Arts & Sports, Social Sciences).
- 232 subject pages exist but their names are not public.

## E–I. Grade 7 / 8 / 9 Mathematics and Integrated Science

**Celebra structure: not publicly accessible; not verified for any of the six examples** (Grade 6 Mathematics, Grade 7 Mathematics, Grade 7 Integrated Science, Grade 8 Mathematics, Grade 8 Integrated Science, Grade 9 Mathematics).

Comparison table (Celebra column left honest):

| Grade | Subject | Celebra structure | KICD structure | Match | Notes |
|---|---|---|---|---|---|
| 7 | Mathematics | Not publicly accessible | 5 strands / 18 sub-strands / 150 lessons (verified from KICD's own design, Msingi pilot) | Cannot be assessed | Sub-strands 1.1 Whole Numbers … 5.1 Data Handling |
| 7 | Integrated Science | Not publicly accessible | 4 strands / 9 sub-strands / 150 lessons (KICD design; strand 4.0 has a contents-vs-summary discrepancy noted in Msingi) | Cannot be assessed | |
| 6 | Mathematics | Not publicly accessible | 16 sub-strands (third-party mirror, unverified) | Cannot be assessed | |
| 8 | Mathematics | Not publicly accessible | 16 sub-strands incl. "1.5 Rates, Ratio, Proportions and Percentages" (mirror, unverified) | Cannot be assessed | Explains why Msingi's Grade 7 Ratios/Percentages find no Grade 7 match |
| 8 | Integrated Science | Not publicly accessible | 6 sub-strands (mirror, unverified) | Cannot be assessed | |
| 9 | Mathematics | Not publicly accessible | 19 sub-strands (mirror, unverified) | Cannot be assessed | |

For reference, the KICD-side structures Msingi already holds or cross-checked:

KICD structure (Grade 8 Mathematics, headings only, from the third-party mirror; verify against KICD before relying on it):

| Strand | Sub-strand | Suggested lessons |
|---|---|---|
| 1.0 Numbers | 1.1 Integers | 6 |
| 1.0 Numbers | 1.2 Fractions | 6 |
| 1.0 Numbers | 1.3 Decimals | 8 |
| 1.0 Numbers | 1.4 Squares and Square Roots | 6 |
| 1.0 Numbers | 1.5 Rates, Ratio, Proportions and Percentages | 14 |
| 2.0 Algebra | 2.1 Algebraic Expressions | 6 |
| 2.0 Algebra | 2.2 Linear Equations | 7 |
| 3.0 Measurements | 3.1 Circles | 5 |
| 3.0 Measurements | 3.2 L Area | 10 |
| 3.0 Measurements | 3.3 Money | 9 |
| 4.0 Geometry | 4.1 Geometrical Constructions | 12 |
| 4.0 Geometry | 4.2 Coordinates and graphs | 14 |
| 4.0 Geometry | 4.3 Scale Drawing | 14 |
| 4.0 Geometry | 4.4 Common Solids | 16 |
| 5.0 Data Handling and  Probability | 5.1 Data Presentation and Interpretation | 10 |
| 5.0 Data Handling and  Probability | 5.2 Probability | 7 |

KICD structure (Grade 9 Mathematics, headings only, from the third-party mirror; verify against KICD before relying on it):

| Strand | Sub-strand | Suggested lessons |
|---|---|---|
| 1.0 Numbers | 1.1 Integers | 6 |
| 1.0 Numbers | 1.2 Cubes and Cube Roots | 6 |
| 1.0 Numbers | 1.3 Indices and Logarithms | 8 |
| 1.0 Numbers | 1.4 Compound Proportions and Rates of Work | 9 |
| 2.0 Algebra | 2.1 Matrices | 8 |
| 2.0 Algebra | 2.2 Equation of a Straight Line | 15 |
| 2.0 Algebra | 2.3 Linear Inequalities | 6 |
| 3.0 Measurements | 3.1 Area | 8 |
| 3.0 Measurements | 3.2 Volume of Solids | 8 |
| 3.0 Measurements | 3.3 Mass, Volume, Weight, and Density | 8 |
| 3.0 Measurements | 3.4 Time, Distance, and Speed | 10 |
| 3.0 Measurements | 3.5 Money | 7 |
| 3.0 Measurements | 3.6 Approximations and Errors | 4 |
| 4.0 Geometry | 4.1 Coordinates and Graphs | 6 |
| 4.0 Geometry | 4.2 Scale Drawing | 14 |
| 4.0 Geometry | 4.3 Similarity and Enlargement | 8 |
| 4.0 Geometry | 4.4 Trigonometry | 7 |
| 5.0 Data Handling and  Probability | 5.1 Data Interpretation (Grouped Data) | 6 |
| 5.0 Data Handling and  Probability | 5.2 Probability | 6 |

KICD structure (Grade 8 Integrated Science, headings only, from the third-party mirror; verify against KICD before relying on it):

| Strand | Sub-strand | Suggested lessons |
|---|---|---|
| 1.0 Mixtures, Elements and Compounds | 1.1 Elements and Compounds | 18 |
| 1.0 Mixtures, Elements and Compounds | 1.2 Physical and chemical changes | 22 |
| 1.0 Mixtures, Elements and Compounds | 1.3 Classes of fire | 20 |
| 2.0 Living Things and the Environment | 2.1 The Cell | 20 |
| 2.0 Living Things and the Environment | 2.2 Movement of materials in and out of  the cell | 16 |
| 2.0 Living Things and the Environment | 2.3 Reproduction in human beings | 18 |


Grade 7 Mathematics and Integrated Science: see `curriculum/cbc/kicd-2026-10/pilot/` (extracted from KICD's own designs).

## J. KICD comparison

Nothing structural can be compared. What Celebra *asserts*:

- level bands match the KICD levels (PP, Lower Primary, Upper Primary, Junior, Senior), as does Msingi;
- the senior pathways named in its videos filters (STEM, Arts & Sports, Social Sciences) resemble KICD's three pathways, but the name is abbreviated and nothing else was verifiable;
- "2-6-3-3-3" structure and CBC performance bands (EE/ME/AE/BE) are described. The `/cbc` page separately describes a "7-level" scale, so Celebra's own pages are not consistent.

Matching names and a claim of alignment do not make this official KICD structure, and nothing public lets the structure itself be compared.

## K. Source attribution

Claims found (as returned by the page-to-text step; some on the parent site):

- "Every feature on Celebra is mapped to Kenya's official KICD Competency-Based Curriculum Framework. Our content, assessments, and reports are aligned to KNEC standards." (`learning.celebra.school/about`)
- "aligns with KICD curriculum standards and KNEC assessment requirements" (`celebra.school/about`)
- "KICD Aligned" and "Developed by the Kenya Institute of Curriculum Development (KICD)" (`celebra.school/cbc`). This second phrase is ambiguous: it most plausibly refers to the curriculum framework, not to Celebra's lessons.
- "CBC-aligned Revision Notes (PP1–Grade 12)" (pricing)

What is **absent**: any document title, ISBN, curriculum version/year, link to a KICD design, statement of KICD permission, or citation of a source. The Terms of Service never mention KICD. The public `/e-learning` HTML contains no mention of KICD or KNEC at all.

## L. Licensing / copyright

**Copyright notice:** "© 2026 Celebra. All rights reserved." (parent site footer, study-videos page). **No open licence is published.**

**Terms of Service** (`celebra.school/legal/terms`, Celebra Education Limited, last updated 2026-01-05; they do not explicitly say they cover `learning.celebra.school`):

- Section 7: all IP in "the Services, including … Content … are and shall remain the exclusive property of Celebra or its licensors".
- The user licence is "limited, non-exclusive, non-transferable, revocable … for their intended educational purposes", and expressly does **not** include "any resale or commercial use of the Services or Content", "any derivative use of the Services or Content", "any downloading, copying …", or "any use of data mining, robots, or similar data gathering and extraction tools".
- `robots.txt` on `learning.celebra.school` disallows GPTBot, ChatGPT-User and CCBot entirely, and disallows `/api/`, `/_next/`, `/students/`, `/login/` and others for every crawler.

| Layer | Owner (as stated) | Reusable by Msingi? |
|---|---|---|
| A. KICD curriculum structure | KICD (All Rights Reserved on its designs). Celebra claims alignment but not ownership or permission. | **Not from Celebra.** Only via KICD's own documents / permission. |
| B. Celebra's original educational content | Celebra or its licensors | No. Terms bar derivative/commercial use and copying. |
| C. Presentation / UI | Celebra | No. |
| D. Questions / quizzes / past papers | Celebra or its licensors; provenance of past papers unknown | No. |
| E. Explanations / lessons | Celebra or its licensors | No. |
| F. Images / media | Celebra or its licensors; third-party sources unknown | No. |

Also noted, not investigated further: the parent site's public `/notes` library offers 8-4-4 era files (Form 1–4: DOCX/PDF/PPTX) with unclear provenance, including one titled "…Confidential". Nothing was downloaded.

## M. Msingi recommendations

Learn from Celebra without copying anything:

1. **State sources precisely.** Celebra's "KICD aligned / Developed by KICD" wording is vague and unverifiable. Msingi should publish an "About our curriculum" page naming the exact KICD design, revision and ISBN each subject's structure comes from, and say plainly that lessons and questions are Msingi-authored. Msingi already stores this in `source_documents`.
2. **Publish Msingi's own Terms/IP page** stating content ownership and what may and may not be reused.
3. **CBC performance bands (EE/ME/AE/BE) on results.** Celebra reports them, while Msingi shows percentages and its own 'Needs practice / Improving / Strong' labels. Adopt only after confirming the official band definitions from KICD/KNEC.
4. **Per-subject resource areas** (notes, flashcards, practice, past papers) are a common pattern. Msingi has lessons, flashcards and practice at topic level; "past papers" would need a source with clear rights (KNEC) first.
5. **A Grade 9 pathways guide** (Celebra's "Njia") fits Msingi's Senior School pathway model, but should be based on KICD's pathway documents.
6. **Do not use Celebra as a data source.** Its structure is gated, and its terms forbid copying, derivative use and data gathering.
7. **If the structure is wanted as a cross-check,** the lawful routes are KICD's own designs (already registered) or asking Celebra in writing.

## Final answers

1. **Does Celebra appear to use the official Kenyan CBC/KICD structure?** It claims to. This could not be verified, because the structure is behind sign-in.
2. **Which parts?** Only framework-level claims: level bands, 2-6-3-3-3, EE/ME/AE/BE bands, and (loosely) the senior pathways. Nothing at strand / sub-strand level was visible.
3. **Does it expose the syllabus structure publicly?** No. Learner pages redirect to sign-in; public pages are marketing, sitemap and embedded metadata only.
4. **Can Msingi legally reuse that structure from Celebra?** No right is granted. The structure belongs to KICD, so go to KICD.
5. **Can Msingi reuse Celebra's lessons?** No (Terms s.7).
6. **Can Msingi reuse Celebra's questions?** No.
7. **Can Msingi reuse their learning outcomes?** No. They are KICD's text or Celebra's own rewording; neither is licensed to Msingi.
8. **Is Celebra useful as a structural cross-check?** Not from public access. A human reading it while signed in is a personal-use question under its Terms; recording it into Msingi would be derivative use.
9. **What does Celebra have that Msingi's architecture lacks?** Visible in public claims only: CBC performance-band reporting, past-paper / exam-question bank sections, KPSEA mock exams, and a pathways-discovery tool. Msingi's curriculum architecture (versions, sources, mappings, review) is already more explicit about provenance than anything Celebra shows publicly.
10. **What to implement?** Items 1–3 and 5 in section M, plus the permission requests to KICD (structure and outcome text) already recommended.
