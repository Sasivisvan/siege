import { AppShell } from "@/components/ui/app-shell";
import { StatCard } from "@/components/ui/stat-card";

const stats = [
  { label: "Active sessions", value: "18" },
  { label: "Flagged attempts", value: "4" },
  { label: "Avg risk score", value: "21.3" },
];

export default function DashboardPage() {
  return (
    <AppShell
      eyebrow="Dashboard"
      title="Review sessions and integrity signals."
      description="A compact overview for recruiters and administrators."
    >
      <div className="grid three-up">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </AppShell>
  );
}
