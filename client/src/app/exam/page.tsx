"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/ui/app-shell';
import { ExamWorkspace } from '@/components/exam/exam-workspace';

function ExamContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('id');

  if (!examId) {
    return (
      <AppShell
        eyebrow="Exam"
        title="No exam selected"
        description="Please select an exam from the dashboard to begin."
        primaryCta={{ label: "Go to Dashboard", href: "/dashboard" }}
      />
    );
  }

  return <ExamWorkspace examId={examId} />;
}

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamContent />
    </Suspense>
  );
}
