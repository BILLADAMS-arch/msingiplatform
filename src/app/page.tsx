import Link from "next/link";
import {
  ArrowRight, BookOpen, Dumbbell, ClipboardCheck, BarChart3, RotateCcw, RefreshCw, Award,
  Sparkles, Target, BookMarked, Layers, Users, GraduationCap, CheckCircle2, MessageCircle,
} from "lucide-react";
import { Button, Card, Pill, Section, FoundationBar } from "@/components/ui";
import { subjectAccent } from "@/lib/subject-colors";

const HERO_PHOTOS = ["/hero1.jpeg", "/hero2.jpeg", "/hero3.jpeg", "/hero4.jpeg"];

// Each step names the part of Msingi that actually does it today.
const LOOP = [
  { icon: BookOpen, title: "Learn", body: "Short, structured lessons with a quick check at the end." },
  { icon: Dumbbell, title: "Practise", body: "Questions that adapt to your current mastery, with instant feedback." },
  { icon: ClipboardCheck, title: "Test", body: "Timed or untimed tests. Nothing is revealed until you submit." },
  { icon: BarChart3, title: "Analyse", body: "See your score broken down topic by topic." },
  { icon: RotateCcw, title: "Revise", body: "A revision plan and your Mistake Book point you to weak topics." },
  { icon: RefreshCw, title: "Retest", body: "Retake the test and compare with your previous attempt." },
  { icon: Award, title: "Master", body: "Topic mastery climbs as you improve — until it's truly yours." },
];

export default function Landing() {
  return (
    <div className="msingi min-h-screen overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-white focus:shadow">
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur border-b border-(--slate)" style={{ background: "rgba(247,250,255,0.85)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Msingi home" className="shrink-0 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.png" alt="Msingi — Learn. Practise. Grow." className="h-11 sm:h-14 w-auto object-contain" />
          </Link>
          <nav aria-label="Page sections" className="hidden md:flex items-center gap-1 text-sm font-semibold text-(--ink-soft)">
            <a href="#how-it-works" className="px-3 py-2 rounded-lg hover:text-(--ink)">How it works</a>
            <a href="#features" className="px-3 py-2 rounded-lg hover:text-(--ink)">Features</a>
            <a href="#families" className="px-3 py-2 rounded-lg hover:text-(--ink)">Parents &amp; teachers</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button href="/login" variant="ghost" size="sm">Log in</Button>
            <Button href="/register" size="sm">Start learning</Button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="relative">
          <div aria-hidden className="absolute inset-x-0 top-0 h-[36rem] -z-10" style={{ background: "radial-gradient(60% 60% at 75% 20%, var(--primary-soft) 0%, rgba(231,239,254,0) 70%)" }} />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
            <div className="fade-in">
              <Pill tone="blue"><GraduationCap size={13} aria-hidden /> Built for the Kenyan CBC</Pill>
              <h1 id="hero-heading" className="disp text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.06] tracking-tight mt-5">
                The smarter way to master the Kenyan CBC.
              </h1>
              <p className="text-(--ink-soft) text-base sm:text-lg mt-5 max-w-xl leading-relaxed">
                Learn concepts. Practise with purpose. Test your understanding. Msingi shows you exactly what you need
                to improve — and keeps you learning until you master it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button href="/register" size="lg">Start learning <ArrowRight size={18} aria-hidden /></Button>
                <Button href="/login" size="lg" variant="secondary">I already have an account</Button>
              </div>
              <p className="disp text-sm mt-8 tracking-wide text-(--primary-deep)">Learn. Practise. Grow.</p>
            </div>

            <ProductPreview />
          </div>
        </section>

        {/* Learning loop */}
        <div className="bg-white border-y border-(--slate)">
          <Section id="how-it-works" size="lg" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
            eyebrow="How Msingi works"
            title="Not just lessons. A loop that leads to mastery."
            description="Every learner follows the same cycle. Msingi keeps track of where you are in it and what should come next.">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
              {LOOP.map((step, i) => {
                const Icon = step.icon;
                const isLoopBack = step.title === "Revise" || step.title === "Retest";
                const isMaster = step.title === "Master";
                return (
                  <li key={step.title} className={isMaster ? "sm:col-span-2 lg:col-span-1" : ""}>
                    <div className={`h-full rounded-2xl border p-4 ${isMaster ? "bg-(--green-soft) border-(--green)" : "bg-(--stone) border-(--slate)"}`}>
                      <div className="flex items-center gap-2.5 lg:flex-col lg:items-start">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isMaster ? "bg-(--green) text-white" : isLoopBack ? "bg-(--amber-soft) text-(--gold-deep)" : "bg-(--primary-soft) text-(--primary-deep)"}`} aria-hidden>
                          <Icon size={18} />
                        </span>
                        <div className="flex items-baseline gap-2 lg:block">
                          <span className="text-[11px] font-bold text-(--muted)">{String(i + 1).padStart(2, "0")}</span>
                          <h3 className="disp text-base leading-tight">{step.title}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-(--ink-soft) mt-2 leading-snug">{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-sm text-(--ink-soft) flex items-start gap-2">
              <RefreshCw size={16} className="text-(--gold-deep) shrink-0 mt-0.5" aria-hidden />
              <span><b className="text-(--ink)">Revise → Retest</b> repeats for any topic you haven&apos;t mastered yet — the loop only closes when you have.</span>
            </p>
          </Section>
        </div>

        {/* Differentiators */}
        <Section id="features" size="lg" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
          eyebrow="What makes Msingi different"
          title="Built around what you understand — not just what you've watched."
          description="Everything below is part of Msingi today.">
          <div className="grid gap-4 md:grid-cols-6">
            <Card padding="lg" className="md:col-span-3">
              <FeatureHead icon={<Layers size={20} />} title="Aligned to the CBC structure" />
              <p className="text-sm text-(--ink-soft) mt-2">
                Content is organised the way the curriculum is: grade, subject, strand, sub-strand and topic — so you always know where you are.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold" aria-label="Curriculum hierarchy">
                {["Grade", "Subject", "Strand", "Sub-strand", "Topic", "Lesson"].map((level, i, all) => (
                  <span key={level} className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-(--primary-soft) text-(--primary-deep)">{level}</span>
                    {i < all.length - 1 && <ArrowRight size={12} className="text-(--muted)" aria-hidden />}
                  </span>
                ))}
              </div>
            </Card>

            <Card padding="lg" className="md:col-span-3">
              <FeatureHead icon={<Dumbbell size={20} />} title="Practice and tests that teach" />
              <ul className="text-sm text-(--ink-soft) mt-2 space-y-1.5">
                <Check>Practice leans toward easier or harder questions based on your mastery.</Check>
                <Check>Every answer gets instant feedback and an explanation.</Check>
                <Check>Multiple choice, true/false, short-answer and numerical questions.</Check>
              </ul>
            </Card>

            <Card padding="lg" className="md:col-span-2">
              <FeatureHead icon={<Target size={20} />} title="Progress you can act on" />
              <p className="text-sm text-(--ink-soft) mt-2">
                Mastery per topic and per subject, your score trend across tests, streaks and achievements.
              </p>
            </Card>

            <Card padding="lg" className="md:col-span-2">
              <FeatureHead icon={<BookMarked size={20} />} title="Personalised revision" />
              <p className="text-sm text-(--ink-soft) mt-2">
                Wrong answers are saved to your Mistake Book, and low test scores come with a revision plan for your weakest topic.
              </p>
            </Card>

            <Card padding="lg" className="md:col-span-2" style={{ background: "linear-gradient(160deg, var(--primary-soft), #FFFFFF 60%)" }}>
              <FeatureHead icon={<Sparkles size={20} />} title="Ask Msingi" />
              <p className="text-sm text-(--ink-soft) mt-2">
                An AI tutor that explains, gives hints and worked examples, and helps you understand <i>why</i> an answer was wrong — rather than just handing you answers.
              </p>
            </Card>
          </div>
        </Section>

        {/* Parents & teachers */}
        <div className="bg-white border-y border-(--slate)">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="relative rounded-3xl overflow-hidden border border-(--slate) aspect-[4/3]" style={{ boxShadow: "var(--shadow-raised)" }}>
              {HERO_PHOTOS.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={i === 0 ? "Kenyan learners working together on a digital lesson" : ""}
                  className="hero-slide absolute inset-0 w-full h-full object-cover" style={{ animationDelay: `${-i * 4}s` }} />
              ))}
            </div>
            <Section id="families" size="lg" className="scroll-mt-20 min-w-0"
              eyebrow="For the whole learning circle"
              title="Learners lead. Parents and teachers can see the way."
              description="Msingi has dedicated views for the adults supporting each learner.">
              <ul className="space-y-4">
                <RoleRow icon={<GraduationCap size={18} />} title="Learners" body="Lessons, practice, tests, flashcards, interactive playground activities and Ask Msingi — all in one place." />
                <RoleRow icon={<Users size={18} />} title="Parents" body="Link your child's account to follow their subject mastery and recent test results." />
                <RoleRow icon={<ClipboardCheck size={18} />} title="Teachers" body="Create classes, assign tests and see how your class is doing, topic by topic." />
              </ul>
            </Section>
          </div>
        </div>

        {/* Closing CTA */}
        <section aria-labelledby="cta-heading" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="rounded-3xl px-6 py-12 sm:px-12 sm:py-16 text-center text-white relative overflow-hidden" style={{ background: "var(--ink)" }}>
            <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(50% 80% at 50% 0%, rgba(21,94,239,0.55) 0%, rgba(21,94,239,0) 70%)" }} />
            <div className="relative">
              <h2 id="cta-heading" className="disp text-3xl sm:text-4xl tracking-tight" style={{ color: "white" }}>Every learner needs a strong foundation.</h2>
              <p className="mt-3 text-base sm:text-lg" style={{ color: "rgba(255,255,255,0.8)" }}>Msingi means foundation. Start building yours today.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Button href="/register" size="lg" className="bg-white! text-(--ink)! hover:bg-(--primary-soft)!">Start learning <ArrowRight size={18} aria-hidden /></Button>
                <Button href="/login" size="lg" variant="ghost" className="text-white! hover:bg-white/10!">Log in</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--slate)">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-(--ink-soft)">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="w-8 h-8 object-contain" />
            <span><b className="disp text-(--ink)">Msingi</b> · Learn. Practise. Grow.</span>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-4 font-semibold">
            <Link href="/login" className="py-2.5 hover:text-(--ink)">Log in</Link>
            <Link href="/register" className="py-2.5 hover:text-(--ink)">Create an account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Product preview                                                          */
/* ---------------------------------------------------------------------- */

// A static illustration of the learner dashboard, built from the same UI
// components the app uses. It deliberately shows no scores or percentages:
// the bars and bands mirror the app's real mastery thresholds, but no
// numbers are presented as if they were a real learner's results.
function ProductPreview() {
  const maths = subjectAccent("Mathematics");
  const focus = [
    { topic: "Fractions", subject: "Mathematics", band: "Needs practice", tone: "coral" as const, bar: 30 },
    { topic: "Living things", subject: "Integrated Science", band: "Improving", tone: "gold" as const, bar: 58 },
    { topic: "Parts of speech", subject: "English", band: "Strong", tone: "green" as const, bar: 88 },
  ];
  return (
    <figure className="fade-in min-w-0">
      <div className="relative">
      <div className="rounded-3xl border border-(--slate) bg-(--stone) p-3 sm:p-4" style={{ boxShadow: "0 24px 60px -24px rgba(11,31,68,0.28)" }} aria-hidden>
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-1 pb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-(--slate)" /><span className="w-2.5 h-2.5 rounded-full bg-(--slate)" /><span className="w-2.5 h-2.5 rounded-full bg-(--slate)" />
          <span className="ml-3 text-[11px] font-semibold text-(--muted)">Your Msingi dashboard</span>
        </div>

        <div className="space-y-3">
          <div className="px-1">
            <div className="disp text-lg">Good morning 👋</div>
            <div className="text-xs text-(--ink-soft)">Ready to continue learning?</div>
          </div>

          <Card padding="sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-(--muted) mb-2">Continue learning</div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: maths.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: maths.color }} /> Mathematics
                </div>
                <div className="font-semibold text-sm">Fractions · Equivalent fractions</div>
                <div className="mt-2"><FoundationBar pct={45} tone="green" height={6} /></div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 min-h-8 px-3 rounded-full text-xs font-semibold text-white bg-(--primary)">Continue <ArrowRight size={12} /></span>
            </div>
          </Card>

          <Card padding="sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-(--muted) mb-2">Focus areas</div>
            <ul className="space-y-2.5">
              {focus.map((f) => (
                <li key={f.topic} className="flex items-center gap-3">
                  <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: subjectAccent(f.subject).color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{f.topic}</span>
                      <Pill tone={f.tone}>{f.band}</Pill>
                    </div>
                    <div className="mt-1.5"><FoundationBar pct={f.bar} tone={f.tone} height={5} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="rounded-2xl p-3.5 flex items-center justify-between gap-3 bg-(--ink) text-white">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.65)" }}>Recommended next</div>
              <div className="text-sm font-semibold">Practise Fractions · 10 questions</div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 min-h-8 px-3 rounded-full text-xs font-semibold bg-white text-(--ink)">Start <ArrowRight size={12} /></span>
          </div>
        </div>
      </div>

      {/* Feature call-outs (capabilities, not statistics) */}
      <div aria-hidden className="hidden sm:flex absolute right-5 -top-4 items-center gap-2 bg-white rounded-2xl border border-(--slate) px-3.5 py-2 text-xs font-semibold" style={{ boxShadow: "var(--shadow-raised)" }}>
        <CheckCircle2 size={14} className="text-(--green)" /> Instant feedback on every answer
      </div>
      <div aria-hidden className="hidden sm:flex absolute left-5 -bottom-4 items-center gap-2 bg-white rounded-2xl border border-(--slate) px-3.5 py-2 text-xs font-semibold" style={{ boxShadow: "var(--shadow-raised)" }}>
        <MessageCircle size={14} className="text-(--primary)" /> Ask Msingi why an answer was wrong
      </div>
      </div>

      <figcaption className="mt-4 sm:mt-9 text-xs text-(--muted) text-center">
        Illustration of the learner dashboard with example topics — not real learner data.
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------------- */
/* Small helpers                                                            */
/* ---------------------------------------------------------------------- */

function FeatureHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-(--primary-soft) text-(--primary-deep) shrink-0" aria-hidden>{icon}</span>
      <h3 className="disp text-lg leading-tight">{title}</h3>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 size={16} className="text-(--green) shrink-0 mt-0.5" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function RoleRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-(--primary-soft) text-(--primary-deep) shrink-0" aria-hidden>{icon}</span>
      <div>
        <div className="font-bold text-(--ink)">{title}</div>
        <p className="text-sm text-(--ink-soft) mt-0.5">{body}</p>
      </div>
    </li>
  );
}
