# Open-source curriculum research — 2026-10-06

Research only. Nothing here was imported, and no database change was made. Statuses describe the licence/notice text actually found; they are not legal advice. Machine-readable versions: `open-sources-registry.json`, `coverage-by-grade.json`, `proposed-mapping-existing-content.json`.

## Headline findings

1. **`Vincent-mutwiri/KICD-Curriculum-Designs` is not an open curriculum source.** Its MIT licence covers the repo's own Python tool. The 133 curriculum Markdown files are full-text conversions of KICD's designs and still carry KICD's "All rights reserved … without the prior written permission of the publisher" notice (English in 110 files, Swahili in the Kiswahili files). No file contains any open-licence wording, and the repo never says KICD authorised publication. Status: **PERMISSION_REQUIRED** for the content.
2. **KICD's own "OER platform" is not clearly open.** The About page says "openly licensed" but names no licence; the footer says "© 2025 KICD. All Rights Reserved".
3. **The only real Kenyan open-licensed CBC material found is the INNODEMS maths textbook series (Grades 7–11), under CC BY-NC-SA 4.0.** NonCommercial conflicts with Msingi Premium, so permission is needed before use. These are textbooks (teaching content), not the official curriculum structure.
4. **Everything else usable is foreign-curriculum teaching material** (Siyavula CC BY unbranded; OpenStax, CK-12, Khan are NonCommercial).
5. **There is no open, machine-readable dataset of the Kenyan CBC structure.** KICD's own documents remain the source of record; Msingi should keep importing metadata only.

## Sources (status)

| Source | Licence | Status |
|---|---|---|
| KICD designs (kicd.ac.ke) | All Rights Reserved | PERMISSION_REQUIRED |
| Vincent-mutwiri repo — KICD content | MIT (code only); KICD notices intact | PERMISSION_REQUIRED |
| Vincent-mutwiri repo — extractor code | MIT | SAFE_WITH_ATTRIBUTION (not needed) |
| KICD OER platform | "open" claimed, none named; © All Rights Reserved | PERMISSION_REQUIRED |
| INNODEMS CBC Maths G7–G11 | CC BY-NC-SA 4.0 (G8/G9 wording ambiguous) | PERMISSION_REQUIRED |
| IDEMS Grade-7 demo repo | none | NOT_RECOMMENDED |
| IDEMS STACK-questions repo | none; empty | NOT_RECOMMENDED |
| Zenodo CBE paper | CC BY 4.0 (paper only) | SAFE_WITH_ATTRIBUTION |
| OpenStax | CC BY-NC-SA 4.0 | PERMISSION_REQUIRED |
| Siyavula | CC BY (unbranded) / CC BY-ND (branded); CAPS | SAFE_WITH_ATTRIBUTION (unbranded) |
| CK-12 | CC BY-NC 3.0 (not read first-hand) | PERMISSION_REQUIRED |
| Khan Academy | CC BY-NC-SA (not read first-hand) | PERMISSION_REQUIRED |
| TESSA | CC BY-SA 4.0 (Bénin page) | SAFE_WITH_ATTRIBUTION |
| Kenya Open Data portal | unclear; no curriculum data | NOT_RECOMMENDED |
| Free-download CBC notes sites | none | NOT_RECOMMENDED |
| GitHub CBC apps (e.g. MwalimuPlus) | none/MIT (code) | NOT_RECOMMENDED |
| Hugging Face | nothing found | NOT_RECOMMENDED |

## GitHub repository assessment

Creator: Vincent Mutwiri (single committer, 17 commits, all on 2026-05-05). Licence: MIT, "Copyright (c) 2026 Curriculum Data Team", which covers "the Software". The README describes a Markdown→JSON extraction tool. Nothing in the repo grants rights over KICD's content or claims KICD's permission.

| Use | Verdict |
|---|---|
| Research | Reading is fine as a cross-check against KICD's own pages. Used here for headings only; none of it was copied into the project. |
| Internal curriculum mapping | Only as a cross-check; record mappings from KICD's own documents. The mirror is a third-party conversion, 5 months old, with at least one table-conversion error. |
| Database import | No (of any KICD text). |
| Modification | No right is granted over the KICD content. |
| Redistribution | No right is granted over the KICD content. |
| Commercial use | No right is granted over the KICD content. The MIT tool code is commercially usable. |

## Version comparison

- The mirror's Grade 7 Mathematics and Integrated Science summary tables match Msingi's pilot exactly (18 + 9 sub-strands, same lesson counts). This independently supports the pilot data.
- Mirror revision labels, extracted automatically from front matter, show mostly "Revised 2024" for G4–G9 and 2025 drafts for G10–G12. They are heuristic, and some labels look inconsistent.
- The mirror is a snapshot of 2026-05-05; Msingi's KICD register is from 2026-10-05. Changes in between are unknown.
- Curriculum versions are not mixed: every Msingi curriculum record already carries a version and a source document.

## Facts surfaced for the Grade 7 mapping

(From the mirror's headings; verify against KICD's own documents before recording.)

- **Percentages and Ratios:** officially a Grade 8 sub-strand, "1.5 Rates, Ratio, Proportions and Percentages" (14 lessons). Grade 9 has "1.4 Compound Proportions and Rates of Work". Neither is in Grade 7, which explains the "no match".
- **Fractions / Decimals:** Grade 6 has 1.4 and 1.5; Grade 7 has 1.3 and 1.4; Grade 8 has 1.2 and 1.3.
- **Nutrition:** Grade 4 Science and Technology has "1.3 Human Digestive System"; Grade 9 Integrated Science has "2.1 Nutrition in plants" and "2.2 Nutrition in animals". There is no "classes of food" or "balanced diet" heading in Grades 4–7.

## Recommended architecture

```
curriculum_frameworks → curriculum_versions → curriculum_levels / pathways
        └→ source_documents (KICD page, drive id, ISBN, revision, access)   ← official source of record
        └→ curriculum_subjects → strands → sub_strands   (numbering, headings, lesson counts only)
                       ▲
            curriculum_mappings (by id; status; reviewer; reason)    ← admin review page
                       ▼
Msingi content: subjects → strands → sub_strands → topics → lessons → questions → tests
Third-party content sources (new, not yet built): content_sources (licence, attribution, URL, permission evidence)
   linked to lessons / questions / resources, with attribution text and a "permission" flag
```

Principles: official structure is metadata only; Msingi content is separate; third-party content is admitted only with a recorded licence and attribution; nothing is moved when a mapping changes.

## Recommended next actions

1. Write to KICD (info@kicd.ac.ke) for written permission to store learning-outcome text and for the licence of the OER platform.
2. Write to INNODEMS (contact@innodems.org) for a commercial licence or written permission covering Msingi, for the Grade 7–11 maths textbooks.
3. Review the 17 mappings in the admin page; decide Percentages/Ratios (Grade 8 later vs supplementary).
4. Continue structure-only import grade by grade from KICD's own documents.
