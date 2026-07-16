"use client";

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/ui/app-shell';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface PlagiarismReport {
  id: string;
  sessionId: string;
  candidateName: string;
  examTitle: string;
  score: number;
  jplagScore: number;
  aiDetectionScore: number;
  flaggedAt: string;
  status: 'pending_review' | 'confirmed' | 'dismissed';
}

export default function PlagiarismDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [reports, setReports] = useState<PlagiarismReport[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    // Simulate fetching integrity reports (would be a real API endpoint in production)
    const mockFetch = async () => {
      setLoadingData(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setReports([
        {
          id: '1',
          sessionId: 'session_123',
          candidateName: 'John Doe',
          examTitle: 'CS101 Midterm',
          score: 0.85,
          jplagScore: 0.92,
          aiDetectionScore: 0.1,
          flaggedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'pending_review'
        },
        {
          id: '2',
          sessionId: 'session_124',
          candidateName: 'Jane Smith',
          examTitle: 'Data Structures Final',
          score: 0.65,
          jplagScore: 0.45,
          aiDetectionScore: 0.88, // High AI detection
          flaggedAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'confirmed'
        }
      ]);
      setLoadingData(false);
    };

    mockFetch();
  }, [isAuthenticated, isLoading]);

  if (isLoading || loadingData) {
    return <AppShell eyebrow="Integrity" title="Loading Reports..." description="" />;
  }

  if (!isAuthenticated || user?.role === 'candidate') {
    return (
      <AppShell
        eyebrow="Access Denied"
        title="Unauthorized"
        description="You do not have permission to view integrity reports."
      />
    );
  }

  return (
    <AppShell
      eyebrow="Security & Integrity"
      title="Plagiarism Reports"
      description="Monitor and review flagged submissions across all your classrooms."
    >
      <div className="card stack" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Flagged Sessions ({reports.length})</h3>
          <button className="button outline">Filter by Status</button>
        </div>

        {reports.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>No flagged submissions found.</p>
        ) : (
          <div className="stack" style={{ gap: '12px' }}>
            {reports.map(report => (
              <article key={report.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-core)', border: '1px solid var(--panel-border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{report.candidateName}</strong>
                    {report.status === 'pending_review' && <span className="badge warning">Needs Review</span>}
                    {report.status === 'confirmed' && <span className="badge" style={{ background: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Confirmed</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Exam: <strong>{report.examTitle}</strong> • Flagged: {new Date(report.flaggedAt).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--muted)' }}>Overall Risk:</span>
                      <strong style={{ color: report.score > 0.7 ? 'var(--danger)' : 'var(--warning)' }}>{(report.score * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--muted)' }}>JPlag Match:</span>
                      <strong style={{ color: report.jplagScore > 0.7 ? 'var(--danger)' : 'var(--warning)' }}>{(report.jplagScore * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--muted)' }}>AI Probability:</span>
                      <strong style={{ color: report.aiDetectionScore > 0.7 ? 'var(--danger)' : 'var(--accent)' }}>{(report.aiDetectionScore * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="button primary" onClick={() => alert('Diff viewer opens here!')}>
                    View Diff
                  </button>
                  <button className="button outline" onClick={() => alert('Action taken.')}>
                    Action
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
