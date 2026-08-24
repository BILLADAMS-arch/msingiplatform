"use client";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { QuestionForm, QuestionDraft } from "@/components/admin/question-form";

export default function NewQuestionPage() {
  const router = useRouter();

  async function create(draft: QuestionDraft) {
    await fetch("/api/admin/questions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
    });
    router.push("/admin/questions");
  }

  return (
    <AdminShell title="New Question">
      <QuestionForm onSubmit={create} submitLabel="Create question" />
    </AdminShell>
  );
}
