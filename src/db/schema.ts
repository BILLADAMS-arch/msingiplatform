import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb,
  pgEnum, unique, primaryKey, doublePrecision, date, index, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ---------------------------------------------------------------------- */
/* Enums                                                                   */
/* ---------------------------------------------------------------------- */
export const roleEnum = pgEnum("role", ["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice", "true_false", "fill_blank", "matching", "ordering", "short_answer", "numerical",
]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const testTypeEnum = pgEnum("test_type", ["quick", "standard", "revision", "full"]);
export const resourceTypeEnum = pgEnum("resource_type", [
  "notes", "worksheet", "past_paper", "marking_scheme", "video", "summary", "flashcard_set",
]);
export const flashcardStatusEnum = pgEnum("flashcard_status", ["new", "easy", "difficult", "review_later"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["FREE", "PREMIUM"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["ACTIVE", "EXPIRED", "CANCELED"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "SUCCESS", "FAILED"]);

/* ---------------------------------------------------------------------- */
/* Identity                                                                */
/* ---------------------------------------------------------------------- */
// id matches the corresponding Supabase Auth user's id by application
// convention (set at registration) — Supabase Auth owns credentials, this
// table holds the app's own identity/role data.
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: roleEnum("role").notNull().default("STUDENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  avatarUrl: text("avatar_url"),
  gradeId: uuid("grade_id").references(() => grades.id),
  goal: varchar("goal", { length: 160 }),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(1),
  lastActiveAt: timestamp("last_active_at"),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  questionsCorrect: integer("questions_correct").notNull().default(0),
  leaderboardOptOut: boolean("leaderboard_opt_out").notNull().default(false),
  onboarded: boolean("onboarded").notNull().default(false),
});

export const parentChildren = pgTable("parent_children", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  childId: uuid("child_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [unique().on(t.parentId, t.childId)]);

/* ---------------------------------------------------------------------- */
/* Curriculum tree: Grade -> Subject -> Strand -> SubStrand -> Topic       */
/* ---------------------------------------------------------------------- */
export const grades = pgTable("grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 40 }).notNull().unique(),
  // Stable identity (PP1, PP2, G1 … G12). Names are display values only.
  code: varchar("code", { length: 20 }).unique(),
  group: varchar("group", { length: 40 }).notNull(), // Early Years / Lower Primary / ...
  order: integer("order").notNull(),
});

// Msingi's learning-content subjects (what learners navigate). The official
// KICD learning areas live separately in curriculum_subjects and are linked
// through curriculum_mappings.
export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  // Stable code (e.g. MATHEMATICS) for logic such as achievements — never match on name.
  code: varchar("code", { length: 80 }),
  description: text("description"),
}, (t) => [uniqueIndex("subjects_grade_code_unique").on(t.gradeId, t.code).where(sql`${t.code} is not null`)]);

export const strands = pgTable("strands", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  order: integer("order").notNull().default(0),
});

export const subStrands = pgTable("sub_strands", {
  id: uuid("id").defaultRandom().primaryKey(),
  strandId: uuid("strand_id").notNull().references(() => strands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  order: integer("order").notNull().default(0),
});

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  subStrandId: uuid("sub_strand_id").notNull().references(() => subStrands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  order: integer("order").notNull().default(0),
  prerequisiteTopicId: uuid("prerequisite_topic_id"),
});

/* ---------------------------------------------------------------------- */
/* Lessons                                                                  */
/* ---------------------------------------------------------------------- */
export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  published: boolean("published").notNull().default(true),
});

export const lessonSections = pgTable("lesson_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 30 }).notNull(), // learn | example | keypoint | vocab
  heading: varchar("heading", { length: 80 }).notNull(),
  body: text("body").notNull(),
  note: text("note"),
  order: integer("order").notNull().default(0),
});

// One row per learner per lesson, created the first time they finish it.
// Makes lesson-completion XP idempotent: finishing again (or a duplicate
// request) never awards it twice. The unique constraint is the guard.
export const lessonCompletions = pgTable("lesson_completions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.lessonId)]);

export const quickChecks = pgTable("quick_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonId: uuid("lesson_id").notNull().unique().references(() => lessons.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation").notNull(),
});

/* ---------------------------------------------------------------------- */
/* Questions & tests                                                        */
/* ---------------------------------------------------------------------- */
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull().default("multiple_choice"),
  prompt: text("prompt").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  explanation: text("explanation").notNull(),
  learningObjective: text("learning_objective"),
  // For type = "short_answer": pipe-separated accepted variants, matched
  // case-insensitively/trimmed (e.g. "numerator|top number").
  answerText: text("answer_text"),
  // For type = "numerical": accepted value +/- tolerance (default 0 = exact).
  answerNumeric: doublePrecision("answer_numeric"),
  answerTolerance: doublePrecision("answer_tolerance").default(0),
});

export const questionOptions = pgTable("question_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull().default(0),
});

export const tests = pgTable("tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  type: testTypeEnum("type").notNull().default("standard"),
  passingThreshold: integer("passing_threshold").notNull().default(60),
  timeLimitSeconds: integer("time_limit_seconds"),
  published: boolean("published").notNull().default(true),
});

export const testQuestions = pgTable("test_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  testId: uuid("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
});

export const testAttempts = pgTable("test_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  testId: uuid("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  score: integer("score"),
  correctCount: integer("correct_count"),
  totalCount: integer("total_count"),
  timeTakenSeconds: integer("time_taken_seconds"),
});

export const testAnswers = pgTable("test_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id").notNull().references(() => testAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  chosenOptionId: uuid("chosen_option_id"),
  chosenText: text("chosen_text"),
  isCorrect: boolean("is_correct").notNull(),
});

/* ---------------------------------------------------------------------- */
/* Progress, mistakes, achievements                                         */
/* ---------------------------------------------------------------------- */
export const topicProgress = pgTable("topic_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  masteryPct: integer("mastery_pct").notNull().default(0),
  attemptsCount: integer("attempts_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.topicId)]);

export const subjectProgress = pgTable("subject_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  masteryPct: integer("mastery_pct").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.subjectId)]);

export const mistakes = pgTable("mistakes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  chosenOptionId: uuid("chosen_option_id"),
  // What the student actually typed, for short_answer/numerical questions —
  // those have no questionOptions row for chosenOptionId to point at.
  chosenText: text("chosen_text"),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  masteredAt: timestamp("mastered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 60 }).notNull().unique(),
  label: varchar("label", { length: 120 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: uuid("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.achievementId)]);

/* ---------------------------------------------------------------------- */
/* Library, bookmarks, playground                                           */
/* ---------------------------------------------------------------------- */
export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  type: resourceTypeEnum("type").notNull(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  topicId: uuid("topic_id").references(() => topics.id),
  difficulty: difficultyEnum("difficulty"),
  fileUrl: text("file_url"),
  bodyText: text("body_text"),
  published: boolean("published").notNull().default(true),
  premiumOnly: boolean("premium_only").notNull().default(false),
});

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.resourceId)]);

export const playgroundActivities = pgTable("playground_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  area: varchar("area", { length: 40 }).notNull(), // mathematics | science | computer | language
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description").notNull(),
  config: jsonb("config"),
  enabled: boolean("enabled").notNull().default(true),
  // Maps this catalog row to a real built-in component (developer-set via
  // seed data only, not exposed in the admin form — see playground registry
  // in src/app/playground/[slug]/page.tsx). Null = catalog entry only.
  slug: varchar("slug", { length: 60 }).unique(),
});

export const playgroundActivityProgress = pgTable("playground_activity_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id").notNull().references(() => playgroundActivities.id, { onDelete: "cascade" }),
  firstUsedAt: timestamp("first_used_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.activityId)]);

/* ---------------------------------------------------------------------- */
/* Flashcards                                                                */
/* ---------------------------------------------------------------------- */
export const flashcards = pgTable("flashcards", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  order: integer("order").notNull().default(0),
});

export const flashcardProgress = pgTable("flashcard_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: uuid("flashcard_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  status: flashcardStatusEnum("status").notNull().default("new"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.flashcardId)]);

/* ---------------------------------------------------------------------- */
/* Daily challenges                                                         */
/* ---------------------------------------------------------------------- */
export const dailyChallengeProgress = pgTable("daily_challenge_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(), // UTC "YYYY-MM-DD"
  targetCount: integer("target_count").notNull().default(10),
  correctStreak: integer("correct_streak").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
}, (t) => [unique().on(t.userId, t.date)]);

/* ---------------------------------------------------------------------- */
/* Classes (teacher), notifications, AI                                     */
/* ---------------------------------------------------------------------- */
export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const classMembers = pgTable("class_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [unique().on(t.classId, t.userId)]);

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  testId: uuid("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 40 }).notNull(),
  payload: jsonb("payload"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------------------------------------------------------------- */
/* Billing — Msingi Premium                                                 */
/* ---------------------------------------------------------------------- */
// One row per learner (STUDENT) account. `payerId` is whoever is paying for
// it — usually the learner themselves, but a PARENT can pay on behalf of a
// linked child, so it's tracked separately from `userId`.
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  payerId: uuid("payer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull().default("FREE"),
  status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  payerId: uuid("payer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull().default("MPESA"),
  amountKes: integer("amount_kes").notNull(),
  phone: varchar("phone", { length: 20 }),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  // Daraja's CheckoutRequestID — how the async STK push callback finds its
  // way back to the right payment row.
  providerRef: varchar("provider_ref", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------------------------------------------------------------- */
/* Official curriculum (KICD) — structure & metadata only                   */
/*                                                                          */
/* Kept separate from Msingi's learning content (subjects/strands/          */
/* sub_strands/topics/lessons/questions). No KICD learning-outcome text or  */
/* other substantial KICD prose is stored here pending licensing — only     */
/* official names, numbering, lesson counts and source traceability.        */
/* ---------------------------------------------------------------------- */
export const curriculumStatusEnum = pgEnum("curriculum_status", ["draft", "active", "archived"]);
export const sourceAccessEnum = pgEnum("source_access", ["viewable", "restricted", "downloadable", "unknown"]);
export const curriculumSubjectCategoryEnum = pgEnum("curriculum_subject_category", ["core", "pathway", "optional", "general"]);
export const curriculumMatchStatusEnum = pgEnum("curriculum_match_status", ["exact", "probable", "needs_review", "no_match"]);

const stamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

export const curriculumFrameworks = pgTable("curriculum_frameworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  authority: varchar("authority", { length: 160 }).notNull(),
  ...stamps,
});

// A published edition of a framework. Revisions become new versions; old
// versions are archived, never overwritten.
export const curriculumVersions = pgTable("curriculum_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  frameworkId: uuid("framework_id").notNull().references(() => curriculumFrameworks.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 80 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  status: curriculumStatusEnum("status").notNull().default("draft"),
  effectiveFrom: date("effective_from"),
  notes: text("notes"),
  ...stamps,
}, (t) => [unique("curriculum_versions_framework_code_unique").on(t.frameworkId, t.code)]);

export const curriculumLevels = pgTable("curriculum_levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...stamps,
}, (t) => [unique("curriculum_levels_version_code_unique").on(t.versionId, t.code)]);

export const curriculumGradeLevels = pgTable("curriculum_grade_levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  levelId: uuid("level_id").notNull().references(() => curriculumLevels.id, { onDelete: "restrict" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
  ...stamps,
}, (t) => [unique("curriculum_grade_levels_version_grade_unique").on(t.versionId, t.gradeId), index("curriculum_grade_levels_level_idx").on(t.levelId)]);

export const curriculumPathways = pgTable("curriculum_pathways", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  levelId: uuid("level_id").notNull().references(() => curriculumLevels.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 60 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...stamps,
}, (t) => [unique("curriculum_pathways_version_code_unique").on(t.versionId, t.code)]);

// One row per official KICD document (traceability). Files are referenced,
// not stored: KICD publishes them view-only.
export const sourceDocuments = pgTable("source_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  kicdPageUrl: text("kicd_page_url").notNull(),
  driveFileId: varchar("drive_file_id", { length: 100 }),
  officialTitle: text("official_title"),
  learningAreaLabel: varchar("learning_area_label", { length: 200 }),
  isbn: varchar("isbn", { length: 32 }),
  firstPublished: varchar("first_published", { length: 40 }),
  revisionLabel: varchar("revision_label", { length: 80 }),
  retrievedAt: timestamp("retrieved_at").notNull(),
  accessStatus: sourceAccessEnum("access_status").notNull().default("unknown"),
  downloadAllowed: boolean("download_allowed"), // null = not checked
  isDraft: boolean("is_draft"), // null = not verified
  notes: text("notes"),
  ...stamps,
}, (t) => [unique("source_documents_version_drive_unique").on(t.versionId, t.driveFileId)]);

export const sourceDocumentGrades = pgTable("source_document_grades", {
  sourceDocumentId: uuid("source_document_id").notNull().references(() => sourceDocuments.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
}, (t) => [primaryKey({ columns: [t.sourceDocumentId, t.gradeId] })]);

// Official learning area for one grade in one version.
export const curriculumSubjects = pgTable("curriculum_subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
  levelId: uuid("level_id").notNull().references(() => curriculumLevels.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 80 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: curriculumSubjectCategoryEnum("category").notNull().default("general"),
  pathwayId: uuid("pathway_id").references(() => curriculumPathways.id, { onDelete: "restrict" }),
  isOptional: boolean("is_optional").notNull().default(false),
  status: curriculumStatusEnum("status").notNull().default("active"),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...stamps,
}, (t) => [unique("curriculum_subjects_version_grade_code_unique").on(t.versionId, t.gradeId, t.code), index("curriculum_subjects_grade_idx").on(t.gradeId)]);

export const curriculumStrands = pgTable("curriculum_strands", {
  id: uuid("id").defaultRandom().primaryKey(),
  curriculumSubjectId: uuid("curriculum_subject_id").notNull().references(() => curriculumSubjects.id, { onDelete: "restrict" }),
  number: varchar("number", { length: 10 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  sourcePage: varchar("source_page", { length: 10 }),
  ...stamps,
}, (t) => [unique("curriculum_strands_subject_number_unique").on(t.curriculumSubjectId, t.number)]);

export const curriculumSubStrands = pgTable("curriculum_sub_strands", {
  id: uuid("id").defaultRandom().primaryKey(),
  strandId: uuid("strand_id").notNull().references(() => curriculumStrands.id, { onDelete: "restrict" }),
  number: varchar("number", { length: 10 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  suggestedLessons: integer("suggested_lessons"),
  sortOrder: integer("sort_order").notNull().default(0),
  sourcePage: varchar("source_page", { length: 10 }),
  ...stamps,
}, (t) => [unique("curriculum_sub_strands_strand_number_unique").on(t.strandId, t.number)]);

// Links one piece of Msingi content to the official structure, by ID.
// Exactly one Msingi column is set per row. Nothing is moved: the Msingi
// record keeps its place, learner data is untouched.
export const curriculumMappings = pgTable("curriculum_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  strandId: uuid("strand_id").references(() => strands.id, { onDelete: "cascade" }),
  subStrandId: uuid("sub_strand_id").references(() => subStrands.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  curriculumSubjectId: uuid("curriculum_subject_id").references(() => curriculumSubjects.id, { onDelete: "set null" }),
  curriculumStrandId: uuid("curriculum_strand_id").references(() => curriculumStrands.id, { onDelete: "set null" }),
  curriculumSubStrandId: uuid("curriculum_sub_strand_id").references(() => curriculumSubStrands.id, { onDelete: "set null" }),
  matchStatus: curriculumMatchStatusEnum("match_status").notNull(),
  notes: text("notes"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  ...stamps,
}, (t) => [
  check("curriculum_mappings_one_target", sql`num_nonnulls(${t.subjectId}, ${t.strandId}, ${t.subStrandId}, ${t.topicId}) = 1`),
  uniqueIndex("curriculum_mappings_subject_unique").on(t.versionId, t.subjectId).where(sql`${t.subjectId} is not null`),
  uniqueIndex("curriculum_mappings_strand_unique").on(t.versionId, t.strandId).where(sql`${t.strandId} is not null`),
  uniqueIndex("curriculum_mappings_sub_strand_unique").on(t.versionId, t.subStrandId).where(sql`${t.subStrandId} is not null`),
  uniqueIndex("curriculum_mappings_topic_unique").on(t.versionId, t.topicId).where(sql`${t.topicId} is not null`),
]);

/* ---------------------------------------------------------------------- */
/* Relations (for query API ergonomics)                                     */
/* ---------------------------------------------------------------------- */
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  testAttempts: many(testAttempts),
  mistakes: many(mistakes),
}));
export const gradesRelations = relations(grades, ({ many }) => ({ subjects: many(subjects) }));
export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  grade: one(grades, { fields: [subjects.gradeId], references: [grades.id] }),
  strands: many(strands),
  tests: many(tests),
}));
export const strandsRelations = relations(strands, ({ one, many }) => ({
  subject: one(subjects, { fields: [strands.subjectId], references: [subjects.id] }),
  subStrands: many(subStrands),
}));
export const subStrandsRelations = relations(subStrands, ({ one, many }) => ({
  strand: one(strands, { fields: [subStrands.strandId], references: [strands.id] }),
  topics: many(topics),
}));
export const topicsRelations = relations(topics, ({ one, many }) => ({
  subStrand: one(subStrands, { fields: [topics.subStrandId], references: [subStrands.id] }),
  lessons: many(lessons),
  questions: many(questions),
}));
export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  topic: one(topics, { fields: [lessons.topicId], references: [topics.id] }),
  sections: many(lessonSections),
  quickCheck: one(quickChecks, { fields: [lessons.id], references: [quickChecks.lessonId] }),
}));
export const questionsRelations = relations(questions, ({ one, many }) => ({
  topic: one(topics, { fields: [questions.topicId], references: [topics.id] }),
  options: many(questionOptions),
}));
export const testsRelations = relations(tests, ({ one, many }) => ({
  subject: one(subjects, { fields: [tests.subjectId], references: [subjects.id] }),
  testQuestions: many(testQuestions),
}));
