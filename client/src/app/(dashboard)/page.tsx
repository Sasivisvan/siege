"use client";

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/ui/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface ExamSummary {
  id: string;
  title: string;
  totalQuestions: number;
  duration: number;
}

interface SessionSummary {
  sessionId: string;
  candidate: { name: string; email: string };
  riskScore: number;
  status: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [stats, setStats] = useState({ total: 0, flagged: 0, avgRisk: 0, completed: 0 });
  const [topRisk, setTopRisk] = useState<SessionSummary[]>([]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    // Recruiter/Admin: fetch their exams
    if (user?.role === 'recruiter' || user?.role === 'admin') {
      apiFetch<{ data: { exams: ExamSummary[] } }>('/api/exams')
        .then((res) => {
          setExams(res.data.exams);

          // Fetch analytics for first exam if available
          if (res.data.exams.length > 0) {
            return apiFetch<{
              data: {
                overview: { totalCandidates: number; flaggedCount: number; averageRisk: number; completedCount: number };
                topRiskSessions: SessionSummary[];
              };
            }>(`/api/analytics/exam/${res.data.exams[0].id}`);
          }
          return null;
        })
        .then((analyticsRes) => {
          if (analyticsRes) {
            const { overview, topRiskSessions } = analyticsRes.data;
            setStats({
              total: overview.totalCandidates,
              flagged: overview.flaggedCount,
              avgRisk: overview.averageRisk,
              completed: overview.completedCount,
            });
            setTopRisk(topRiskSessions);
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return <AppShell eyebrow="Dashboard" title="Loading..." description="" />;
  }

  if (!isAuthenticated) {
    return (
      <AppShell
        eyebrow="Dashboard"
        title="Please sign in"
        description="You need to be logged in to view the dashboard."
        primaryCta={{ label: "Sign in", href: "/login" }}
      />
    );
  }

  // Candidate view
  if (user?.role === 'candidate') {
    return (
      <AppShell
        eyebrow="Dashboard"
        title={`Welcome, ${user.name}`}
        description="Your available exams will appear here."
      >
        <p style={{ color: 'var(--muted)' }}>No exams assigned yet. Check with your recruiter.</p>
      </AppShell>
    );
  }

  // Recruiter / Admin view
  return (
    <AppShell
      eyebrow="Dashboard"
      title="Review sessions and integrity signals."
      description={`Welcome back, ${user?.name}. You have ${exams.length} exam(s).`}
      primaryCta={{ label: "Create exam", href: "/exams/create" }}
    >
      <div className="grid three-up">
        <StatCard label="Total candidates" value={String(stats.total)} />
        <StatCard label="Flagged attempts" value={String(stats.flagged)} />
        <StatCard label="Avg risk score" value={`${stats.avgRisk}%`} />
      </div>

      {topRisk.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Highest Risk Sessions</h3>
          <div className="stack">
            {topRisk.map((session) => (
              <article key={session.sessionId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{session.candidate?.name || 'Unknown'}</strong>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {session.candidate?.email}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '1.2rem', fontWeight: 700,
                    color: session.riskScore >= 75 ? '#ef4444' : session.riskScore >= 50 ? '#f59e0b' : 'var(--accent)',
                  }}>
                    {session.riskScore}%
                  </span>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {session.status}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {exams.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Your Exams</h3>
          <div className="stack">
            {exams.map((exam) => (
              <article key={exam.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{exam.title}</strong>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {exam.totalQuestions} questions · {exam.duration} min
                  </p>
                </div>
                <a href={`/exam?id=${exam.id}`} className="button">View</a>
              </article>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
