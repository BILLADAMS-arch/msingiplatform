import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb,
  pgEnum, unique, primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  group: varchar("group", { length: 40 }).notNull(), // Early Years / Lower Primary / ...
  order: integer("order").notNull(),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
});

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
});

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
