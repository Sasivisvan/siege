import { AppShell } from "@/components/ui/app-shell";
import { ExamWorkspace } from "@/components/exam/exam-workspace";

export default function ExamPage() {
  return (
    <AppShell
      eyebrow="Exam"
      title="Candidate workspace"
      description="A focused layout for answering questions and monitoring session health."
    >
      <ExamWorkspace />
    </AppShell>
  );
}
