import { AppShell } from "@/components/ui/app-shell";
import { FeatureCard } from "@/components/ui/feature-card";

const features = [
  {
    title: "Exam delivery",
    description: "Host coding, MCQ, and aptitude assessments in a single flow.",
  },
  {
    title: "Proctoring",
    description: "Capture webcam, focus, and clipboard telemetry in-browser.",
  },
  {
    title: "Reviewer dashboard",
    description: "Inspect sessions, risk scores, and event timelines quickly.",
  },
];

export default function HomePage() {
  return (
    <AppShell
      eyebrow="SIEGE"
      title="Secure assessments with real-time proctoring."
      description="A browser-first client for candidates, recruiters, and admins."
      primaryCta={{ label: "Open exam workspace", href: "/exam" }}
      secondaryCta={{ label: "View dashboard", href: "/dashboard" }}
    >
      <div className="grid">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </AppShell>
  );
}
