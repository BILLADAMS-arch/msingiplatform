/**
 * Labels and rules for reviewing how Msingi content relates to the official
 * curriculum. Shared by the admin API (validation) and the admin page (display).
 */
export const MATCH_STATUSES = ["exact", "probable", "needs_review", "no_match", "supplementary"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  exact: "Exact match",
  probable: "Probable match",
  needs_review: "Needs review",
  no_match: "No official match",
  supplementary: "Msingi supplementary content",
};

export const MATCH_STATUS_HELP: Record<MatchStatus, string> = {
  exact: "Same official sub-strand: name and placement agree.",
  probable: "Very likely the official sub-strand; the content should be checked.",
  needs_review: "A candidate exists but the fit is uncertain, or no decision has been made.",
  no_match: "No official equivalent was found for this grade. Needs a decision.",
  supplementary: "Msingi-authored content kept on purpose; not part of the official curriculum.",
};

/** Statuses that assert an official location; they must point at one. */
export const STATUSES_REQUIRING_TARGET: MatchStatus[] = ["exact", "probable"];
/** Statuses that assert there is no official location; they must not point at one. */
export const STATUSES_FORBIDDING_TARGET: MatchStatus[] = ["no_match", "supplementary"];

export type MappingKind = "subject" | "strand" | "sub_strand" | "topic";
