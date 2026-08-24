/**
 * Seed script — migrates the Phase-1 prototype's in-memory demo content
 * (GRADE_GROUPS, SUBJECT_LIBRARY, the Grade 7 Mathematics roadmap,
 * FRACTIONS_LESSON, QUESTION_BANK, ACHIEVEMENTS_CATALOG) into real rows.
 * Run with: npm run db:seed
 */
import { db } from "./index";
import {
  grades, subjects, strands, subStrands, topics, lessons, lessonSections,
  quickChecks, questions, questionOptions, tests, testQuestions,
  achievements, playgroundActivities, flashcards, resources,
} from "./schema";

const GRADE_GROUPS: Record<string, string[]> = {
  "Early Years": ["PP1", "PP2"],
  "Lower Primary": ["Grade 1", "Grade 2", "Grade 3"],
  "Upper Primary": ["Grade 4", "Grade 5", "Grade 6"],
  "Junior School": ["Grade 7", "Grade 8", "Grade 9"],
  "Senior School": ["Grade 10", "Grade 11", "Grade 12"],
};

const SUBJECT_LIBRARY: Record<string, string[]> = {
  "Grade 6": ["Mathematics", "English", "Kiswahili", "Science & Technology", "Social Studies"],
  "Grade 7": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Agriculture"],
  "Grade 8": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "ICT", "Business Studies"],
  "Grade 9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "ICT", "Agriculture"],
};

const ROADMAP_G7_MATH = ["Numbers", "Fractions", "Decimals", "Percentages", "Ratios", "Algebra"];

const FRACTIONS_LESSON = {
  title: "Adding Fractions",
  sections: [
    { kind: "learn", heading: "Learn", body: "To add fractions, the denominators (bottom numbers) must be the same. If they aren't, find the lowest common denominator first, then add the numerators (top numbers) and keep the denominator." },
    { kind: "example", heading: "Example", body: "1/2 + 1/4 = 2/4 + 1/4 = 3/4", note: "We converted 1/2 into 2/4 so both fractions share a denominator of 4." },
    { kind: "keypoint", heading: "Remember", body: "Always find a common denominator before adding or subtracting fractions. Never add denominators directly." },
    { kind: "vocab", heading: "Vocabulary", body: "Numerator — the top number. Denominator — the bottom number. Common denominator — a shared multiple of two denominators." },
  ],
  quickCheck: {
    question: "What is 1/2 + 1/4?",
    options: ["1/6", "2/4", "3/4", "4/6"],
    correctIndex: 2,
    explanation: "Convert 1/2 to 2/4 (same denominator as 1/4), then add numerators: 2/4 + 1/4 = 3/4.",
  },
};

const QUESTION_BANK: Record<string, { q: string; options: string[]; correct: number; difficulty: "easy" | "medium" | "hard"; explanation: string }[]> = {
  Fractions: [
    { q: "1/3 + 1/3 = ?", options: ["2/3", "1/6", "2/6", "1/3"], correct: 0, difficulty: "easy", explanation: "Same denominator — just add the numerators: 1+1=2, so 2/3." },
    { q: "1/2 + 1/4 = ?", options: ["1/6", "2/4", "3/4", "4/6"], correct: 2, difficulty: "easy", explanation: "Convert to a common denominator (4): 2/4 + 1/4 = 3/4." },
    { q: "2/3 + 1/6 = ?", options: ["3/9", "5/6", "3/6", "1/2"], correct: 1, difficulty: "medium", explanation: "Common denominator is 6: 4/6 + 1/6 = 5/6." },
    { q: "3/4 − 1/2 = ?", options: ["1/4", "2/2", "1/2", "2/4"], correct: 0, difficulty: "medium", explanation: "Convert 1/2 to 2/4: 3/4 − 2/4 = 1/4." },
    { q: "Which fraction is equivalent to 2/6?", options: ["1/3", "2/3", "1/6", "3/6"], correct: 0, difficulty: "easy", explanation: "Divide top and bottom by 2: 2÷2 / 6÷2 = 1/3." },
    { q: "5/6 − 1/3 = ?", options: ["4/3", "1/2", "4/6", "1/6"], correct: 1, difficulty: "medium", explanation: "Convert 1/3 to 2/6: 5/6 − 2/6 = 3/6 = 1/2." },
    { q: "1/4 + 1/3 = ?", options: ["2/7", "7/12", "1/12", "5/12"], correct: 1, difficulty: "hard", explanation: "Common denominator 12: 3/12 + 4/12 = 7/12." },
    { q: "2/5 of 25 is?", options: ["5", "10", "15", "20"], correct: 1, difficulty: "hard", explanation: "25 ÷ 5 = 5, then 5 × 2 = 10." },
  ],
  Ratios: [
    { q: "Simplify the ratio 8:12.", options: ["2:3", "4:6", "1:2", "3:4"], correct: 0, difficulty: "medium", explanation: "Divide both sides by 4: 8÷4 : 12÷4 = 2:3." },
    { q: "Share 20 sweets in the ratio 2:3. What is the smaller share?", options: ["4", "8", "10", "12"], correct: 1, difficulty: "hard", explanation: "Total parts = 5. 20÷5=4 per part. Smaller share = 2×4 = 8." },
    { q: "A ratio of 1:4 means for every 1 part of A there are how many parts of B?", options: ["1", "2", "3", "4"], correct: 3, difficulty: "easy", explanation: "The second number in the ratio tells you B's parts directly." },
    { q: "Express 15:25 in simplest form.", options: ["3:5", "5:3", "1:2", "2:3"], correct: 0, difficulty: "medium", explanation: "Divide by 5: 15÷5:25÷5 = 3:5." },
  ],
  Percentages: [
    { q: "What is 50% of 80?", options: ["20", "40", "60", "45"], correct: 1, difficulty: "easy", explanation: "50% means half: 80 ÷ 2 = 40." },
    { q: "Convert 3/4 to a percentage.", options: ["34%", "75%", "43%", "25%"], correct: 1, difficulty: "medium", explanation: "3 ÷ 4 = 0.75, ×100 = 75%." },
    { q: "A shirt costs KSh 1000 and is discounted by 20%. New price?", options: ["KSh 800", "KSh 900", "KSh 700", "KSh 950"], correct: 0, difficulty: "hard", explanation: "20% of 1000 = 200. 1000 − 200 = 800." },
  ],
  Numbers: [
    { q: "What is the place value of 7 in 3,742?", options: ["Tens", "Hundreds", "Thousands", "Ones"], correct: 1, difficulty: "easy", explanation: "7 sits in the hundreds place." },
    { q: "Round 4,567 to the nearest hundred.", options: ["4,500", "4,600", "4,570", "4,000"], correct: 1, difficulty: "medium", explanation: "67 rounds the hundreds digit up: 4,600." },
  ],
};

const ACHIEVEMENTS_CATALOG = [
  { code: "streak7", icon: "🔥", label: "7-Day Streak" },
  { code: "q100", icon: "📚", label: "100 Questions" },
  { code: "perfect", icon: "🎯", label: "Perfect Score" },
  { code: "mathmaster", icon: "🧠", label: "Mathematics Master" },
  { code: "bigimprove", icon: "🚀", label: "Big Improvement" },
  { code: "first100", icon: "💯", label: "First 100%" },
  { code: "topicmaster", icon: "🏆", label: "Topic Master" },
];

const FLASHCARDS_FRACTIONS = [
  { front: "Numerator", back: "The top number of a fraction — it shows how many parts you have." },
  { front: "Denominator", back: "The bottom number of a fraction — it shows how many equal parts the whole is divided into." },
  { front: "Common denominator", back: "A shared multiple of two or more denominators, used so fractions can be added or subtracted." },
  { front: "Equivalent fractions", back: "Fractions that represent the same value even though they use different numbers, e.g. 1/2 = 2/4 = 3/6." },
  { front: "Simplifying a fraction", back: "Dividing the numerator and denominator by their greatest common factor to write the fraction in its lowest terms." },
  { front: "Mixed number", back: "A whole number combined with a fraction, e.g. 1 3/4." },
  { front: "Improper fraction", back: "A fraction where the numerator is greater than or equal to the denominator, e.g. 7/4." },
  { front: "Reciprocal", back: "A fraction flipped upside down — the reciprocal of 2/3 is 3/2. Multiplying a number by its reciprocal gives 1." },
];

const LIBRARY_RESOURCES_FRACTIONS: { title: string; type: "summary" | "notes" | "worksheet"; difficulty: "easy" | "medium" | "hard"; bodyText: string }[] = [
  {
    title: "Fractions Cheat Sheet", type: "summary", difficulty: "easy",
    bodyText: "FRACTIONS — QUICK REFERENCE\n\n1. Adding/subtracting: denominators must match first. Convert using a common denominator, then add or subtract the numerators only.\n2. Multiplying: multiply numerators together and denominators together, then simplify.\n3. Dividing: multiply by the reciprocal of the second fraction.\n4. Simplifying: divide numerator and denominator by their greatest common factor.\n5. Equivalent fractions: multiply (or divide) the numerator and denominator by the same number.",
  },
  {
    title: "Worked Examples: Adding & Subtracting Fractions", type: "notes", difficulty: "medium",
    bodyText: "EXAMPLE 1\n1/3 + 1/6\nCommon denominator is 6.\n1/3 = 2/6\n2/6 + 1/6 = 3/6 = 1/2\n\nEXAMPLE 2\n3/4 − 1/3\nCommon denominator is 12.\n3/4 = 9/12, 1/3 = 4/12\n9/12 − 4/12 = 5/12\n\nEXAMPLE 3\n2/5 + 3/10\nCommon denominator is 10.\n2/5 = 4/10\n4/10 + 3/10 = 7/10",
  },
  {
    title: "Fractions Revision Worksheet", type: "worksheet", difficulty: "medium",
    bodyText: "Try these on your own, then check with the Practice section:\n\n1. 1/4 + 1/8 = ?\n2. 5/6 − 1/2 = ?\n3. Simplify 12/18.\n4. Write two fractions equivalent to 3/5.\n5. 2/3 of 18 is?\n\nWhen you're ready, head to Practice → Fractions to try similar questions with instant feedback.",
  },
];

const PLAYGROUND_TEASERS = [
  { area: "mathematics", title: "Fraction Explorer", description: "Visually manipulate fractions." },
  { area: "mathematics", title: "Number Line", description: "Drag values along a number line." },
  { area: "mathematics", title: "Geometry Lab", description: "Manipulate shapes." },
  { area: "science", title: "Solar System Explorer", description: "Explore the planets." },
  { area: "science", title: "States of Matter", description: "Interact with solids, liquids, gases." },
  { area: "computer", title: "HTML Playground", description: "Basic HTML exercises." },
];

async function main() {
  console.log("Seeding Msingi...");

  // 1. Grades
  let order = 0;
  const gradeIdByName: Record<string, string> = {};
  for (const [group, names] of Object.entries(GRADE_GROUPS)) {
    for (const name of names) {
      const [g] = await db.insert(grades).values({ name, group, order: order++ }).returning();
      gradeIdByName[name] = g.id;
    }
  }
  console.log(`  ${Object.keys(gradeIdByName).length} grades`);

  // 2. Subjects (only for grades we have a library entry for)
  const mathSubjectIdByGrade: Record<string, string> = {};
  for (const [gradeName, subjectNames] of Object.entries(SUBJECT_LIBRARY)) {
    for (const name of subjectNames) {
      const [s] = await db.insert(subjects).values({ gradeId: gradeIdByName[gradeName], name }).returning();
      if (gradeName === "Grade 7" && name === "Mathematics") mathSubjectIdByGrade[gradeName] = s.id;
    }
  }
  console.log(`  subjects seeded for ${Object.keys(SUBJECT_LIBRARY).length} grades`);

  // 3. Grade 7 Mathematics: full strand -> sub-strand -> topic depth
  const g7MathId = mathSubjectIdByGrade["Grade 7"];
  const [numberStrand] = await db.insert(strands).values({ subjectId: g7MathId, name: "Numbers, Fractions & Ratios", order: 0 }).returning();
  const [numberSubStrand] = await db.insert(subStrands).values({ strandId: numberStrand.id, name: "Working with Numbers", order: 0 }).returning();

  const topicIdByName: Record<string, string> = {};
  for (let i = 0; i < ROADMAP_G7_MATH.length; i++) {
    const [t] = await db.insert(topics).values({ subStrandId: numberSubStrand.id, name: ROADMAP_G7_MATH[i], order: i }).returning();
    topicIdByName[ROADMAP_G7_MATH[i]] = t.id;
  }
  console.log(`  Grade 7 Mathematics roadmap: ${ROADMAP_G7_MATH.join(", ")}`);

  // 4. Fractions lesson + sections + quick check
  const [lesson] = await db.insert(lessons).values({ topicId: topicIdByName["Fractions"], title: FRACTIONS_LESSON.title }).returning();
  for (let i = 0; i < FRACTIONS_LESSON.sections.length; i++) {
    const s = FRACTIONS_LESSON.sections[i];
    await db.insert(lessonSections).values({ lessonId: lesson.id, kind: s.kind, heading: s.heading, body: s.body, note: (s as any).note ?? null, order: i });
  }
  await db.insert(quickChecks).values({
    lessonId: lesson.id,
    question: FRACTIONS_LESSON.quickCheck.question,
    options: FRACTIONS_LESSON.quickCheck.options,
    correctIndex: FRACTIONS_LESSON.quickCheck.correctIndex,
    explanation: FRACTIONS_LESSON.quickCheck.explanation,
  });
  console.log("  Fractions lesson + quick check");

  // 5. Question bank -> questions + options, per topic
  const questionIdsByTopic: Record<string, string[]> = {};
  for (const [topicName, qs] of Object.entries(QUESTION_BANK)) {
    const topicId = topicIdByName[topicName];
    if (!topicId) continue;
    questionIdsByTopic[topicName] = [];
    for (const q of qs) {
      const [question] = await db.insert(questions).values({
        topicId, type: "multiple_choice", prompt: q.q, difficulty: q.difficulty, explanation: q.explanation,
      }).returning();
      questionIdsByTopic[topicName].push(question.id);
      for (let i = 0; i < q.options.length; i++) {
        await db.insert(questionOptions).values({ questionId: question.id, label: q.options[i], isCorrect: i === q.correct, order: i });
      }
    }
  }
  console.log(`  question bank seeded: ${Object.values(questionIdsByTopic).flat().length} questions`);

  // 6. Standard Test: 10 questions across Fractions/Ratios/Percentages (mirrors prototype's buildTestQuestions)
  const [standardTest] = await db.insert(tests).values({
    subjectId: g7MathId, title: "Standard Test — Fractions, Ratios & Percentages", type: "standard", passingThreshold: 60, timeLimitSeconds: 900,
  }).returning();
  const testPlan = ["Fractions", "Fractions", "Fractions", "Fractions", "Ratios", "Ratios", "Ratios", "Percentages", "Percentages", "Fractions"];
  for (let i = 0; i < testPlan.length; i++) {
    const topicQs = questionIdsByTopic[testPlan[i]];
    const questionId = topicQs[i % topicQs.length];
    await db.insert(testQuestions).values({ testId: standardTest.id, questionId, order: i });
  }
  console.log("  Standard Test assembled (10 questions)");

  // 7. Achievements catalog
  await db.insert(achievements).values(ACHIEVEMENTS_CATALOG);
  console.log(`  ${ACHIEVEMENTS_CATALOG.length} achievements`);

  // 8. Playground teasers (Phase 6 — activities disabled until built)
  await db.insert(playgroundActivities).values(PLAYGROUND_TEASERS.map((p) => ({ ...p, enabled: false })));
  console.log(`  ${PLAYGROUND_TEASERS.length} playground activity placeholders`);

  // 9. Flashcards (Fractions vocabulary deck)
  await db.insert(flashcards).values(
    FLASHCARDS_FRACTIONS.map((c, i) => ({ topicId: topicIdByName["Fractions"], front: c.front, back: c.back, order: i })),
  );
  console.log(`  ${FLASHCARDS_FRACTIONS.length} flashcards (Fractions)`);

  // 10. Library resources (Fractions)
  await db.insert(resources).values(
    LIBRARY_RESOURCES_FRACTIONS.map((r) => ({
      title: r.title, type: r.type, difficulty: r.difficulty, bodyText: r.bodyText,
      gradeId: gradeIdByName["Grade 7"], subjectId: g7MathId, topicId: topicIdByName["Fractions"],
    })),
  );
  console.log(`  ${LIBRARY_RESOURCES_FRACTIONS.length} library resources (Fractions)`);

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
