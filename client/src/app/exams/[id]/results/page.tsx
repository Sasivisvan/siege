"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/app-shell';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface AnalyticsData {
  exam: {
    id: string;
    title: string;
    totalQuestions: number;
    duration: number;
  };
  overview: {
    totalCandidates: number;
    completedCount: number;
    completionRate: string;
    averageRisk: number;
    flaggedCount: number;
  };
  riskDistribution: {
    clean: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRiskSessions: Array<{
    sessionId: string;
    candidate: { _id: string; name: string; email: string };
    riskScore: number;
    status: string;
    startedAt: string;
  }>;
}

export default function ExamResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    // Prevent students from viewing
    if (user?.role !== 'recruiter' && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const res = await apiFetch<{ data: AnalyticsData }>(`/api/analytics/exam/${id}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load exam results');
      } finally {
        setLoadingData(false);
      }
    };

    fetchAnalytics();
  }, [id, isAuthenticated, isLoading, user, router]);

  if (isLoading || loadingData) {
    return <AppShell eyebrow="Results" title="Loading..." description="" />;
  }

  if (error || !data) {
    return (
      <AppShell eyebrow="Error" title="Could not load results" description="">
        <div className="card" style={{ borderColor: 'var(--destructive)', color: 'var(--destructive)' }}>
          {error || 'No analytics found for this exam.'}
        </div>
      </AppShell>
    );
  }

  const { exam, overview, riskDistribution, topRiskSessions } = data;

  return (
    <AppShell
      eyebrow="Exam Results"
      title={exam.title}
      description={`Overview and analytics for ${exam.title}`}
    >
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()} className="button outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
          &larr; Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{overview.totalCandidates}</h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Total Submissions</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{overview.completionRate}</h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Completion Rate</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: overview.averageRisk > 50 ? 'var(--destructive)' : 'var(--primary)' }}>
            {overview.averageRisk}
          </h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Average Risk Score</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="card stack">
          <h3>Risk Distribution</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Clean (0-20)</span>
            <strong>{riskDistribution.clean}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Low (21-40)</span>
            <strong>{riskDistribution.low}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Medium (41-70)</span>
            <strong>{riskDistribution.medium}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#f97316' }}>High (71-90)</span>
            <strong>{riskDistribution.high}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--destructive)' }}>Critical (91+)</span>
            <strong>{riskDistribution.critical}</strong>
          </div>
        </div>

        <div className="card stack">
          <h3>Student Submissions</h3>
          {topRiskSessions.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No students have taken this exam yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topRiskSessions.map((session) => (
                <div key={session.sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div>
                    <strong style={{ display: 'block' }}>{session.candidate?.name || 'Unknown Student'}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{session.candidate?.email || 'N/A'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: 4, 
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      background: session.riskScore > 70 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: session.riskScore > 70 ? 'var(--destructive)' : '#22c55e',
                    }}>
                      Risk: {session.riskScore}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem', textTransform: 'capitalize' }}>
                      {session.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
