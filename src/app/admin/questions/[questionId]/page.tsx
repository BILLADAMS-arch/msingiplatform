"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { QuestionForm, QuestionDraft } from "@/components/admin/question-form";

export default function EditQuestionPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<QuestionDraft> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/questions/${questionId}`).then((r) => r.json()).then((d) => {
      setInitial({ topicId: d.topicId, type: d.type, prompt: d.prompt, difficulty: d.difficulty, explanation: d.explanation, options: d.options });
    });
  }, [questionId]);

  async function save(draft: QuestionDraft) {
    await fetch(`/api/admin/questions/${questionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
    });
    router.push("/admin/questions");
  }

  if (!initial) return <AdminShell title="Edit Question"><p className="text-sm text-[--ink-soft]">Loading…</p></AdminShell>;

  return (
    <AdminShell title="Edit Question">
      <QuestionForm initial={initial} onSubmit={save} submitLabel="Save changes" />
    </AdminShell>
  );
}
