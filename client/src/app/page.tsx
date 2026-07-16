"use client";

import { AppShell } from "@/components/ui/app-shell";
import { FeatureCard } from "@/components/ui/feature-card";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    title: "Exam delivery",
    description: "Host coding, MCQ, and aptitude assessments in a single flow.",
  },
  {
    title: "AI Proctoring",
    description: "Real-time face detection, phone detection, and liveness verification — all in-browser.",
  },
  {
    title: "Reviewer dashboard",
    description: "Inspect sessions, risk scores, and event timelines with plagiarism analysis.",
  },
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AppShell
      eyebrow="SIEGE"
      title="Secure assessments with real-time proctoring."
      description="AI-powered integrity monitoring for coding assessments. Built for recruiters who need to trust their results."
      primaryCta={
        isAuthenticated
          ? { label: "Open dashboard", href: "/dashboard" }
          : { label: "Get started", href: "/register" }
      }
      secondaryCta={
        isAuthenticated
          ? undefined
          : { label: "Sign in", href: "/login" }
      }
    >
      <div className="grid">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </AppShell>
  );
}
