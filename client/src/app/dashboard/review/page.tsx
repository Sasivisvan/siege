"use client";

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/ui/app-shell';
import { useAuth } from '@/lib/auth-context';

interface ReviewTask {
  id: string;
  candidateName: string;
  examTitle: string;
  questionTitle: string;
  questionDescription: string;
  rubric: string;
  candidateAnswer: string;
  aiSuggestedScore: number;
  aiConfidence: number;
  aiFeedback: string;
  status: 'pending' | 'reviewed';
}

export default function ReviewQueuePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    // Simulate fetching review tasks (mock data for now)
    const mockFetch = async () => {
      setLoadingData(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setTasks([
        {
          id: 't_1',
          candidateName: 'John Doe',
          examTitle: 'Advanced Software Engineering',
          questionTitle: 'Microservices Architecture',
          questionDescription: 'Explain the CAP theorem and how it applies to a distributed microservices architecture using eventual consistency.',
          rubric: 'Must mention Consistency, Availability, Partition Tolerance. Must explain eventual consistency trade-offs. Max score 20 points.',
          candidateAnswer: 'The CAP theorem states that a distributed system can only have two of the three: Consistency, Availability, and Partition Tolerance. In a microservices architecture, we often choose AP (Availability and Partition Tolerance) because networks are unreliable (P is required). To handle the loss of strong consistency, we use eventual consistency where data propagates across services asynchronously. For example, a saga pattern or event sourcing can ensure that all services eventually agree on the state.',
          aiSuggestedScore: 18,
          aiConfidence: 0.65, // Below 0.7 triggers manual review
          aiFeedback: 'The student correctly identifies CAP theorem elements and explains the AP trade-off well. Mentioned eventual consistency correctly. Missing specific constraints on latency trade-offs, but overall very strong.',
          status: 'pending'
        }
      ]);
      setLoadingData(false);
    };

    mockFetch();
  }, [isAuthenticated, isLoading]);

  if (isLoading || loadingData) {
    return <AppShell eyebrow="Evaluation" title="Loading Review Queue..." description="" />;
  }

  if (!isAuthenticated || user?.role === 'candidate') {
    return (
      <AppShell
        eyebrow="Access Denied"
        title="Unauthorized"
        description="You do not have permission to view the review queue."
      />
    );
  }

  return (
    <AppShell
      eyebrow="Evaluation"
      title="Essay Review Queue"
      description="Submissions that require human grading due to low AI confidence or complex rubrics."
    >
      <div className="card stack" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Pending Reviews ({tasks.length})</h3>
        </div>

        {tasks.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>All caught up! No submissions need human review.</p>
        ) : (
          <div className="stack" style={{ gap: '24px' }}>
            {tasks.map(task => (
              <div key={task.id} className="card stack" style={{ background: 'var(--bg-core)', border: '1px solid var(--panel-border)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {task.examTitle}
                    </div>
                    <h3 style={{ margin: '4px 0 0 0' }}>{task.candidateName}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>AI Confidence</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: task.aiConfidence < 0.5 ? 'var(--danger)' : 'var(--warning)' }}>
                      {(task.aiConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="stack">
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Question Prompt</strong>
                      <p style={{ marginTop: '4px', fontSize: '0.95rem' }}><strong>{task.questionTitle}</strong>: {task.questionDescription}</p>
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Grading Rubric</strong>
                      <div style={{ marginTop: '4px', padding: '12px', background: 'var(--panel-solid)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--panel-border)', fontSize: '0.9rem' }}>
                        {task.rubric}
                      </div>
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Candidate Answer</strong>
                      <div style={{ marginTop: '4px', padding: '16px', background: '#1a1d21', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {task.candidateAnswer}
                      </div>
                    </div>
                  </div>

                  <div className="stack" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)' }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent)' }}>✨</span> AI Evaluation
                    </h4>
                    
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Suggested Score</strong>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text)' }}>
                        {task.aiSuggestedScore} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 400 }}>/ 20</span>
                      </div>
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>AI Reasoning</strong>
                      <p style={{ marginTop: '4px', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        {task.aiFeedback}
                      </p>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--panel-border)' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Override Score (Optional)</label>
                      <input type="number" defaultValue={task.aiSuggestedScore} style={{ width: '100%', marginBottom: '16px' }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="button primary" style={{ flex: 1 }} onClick={() => alert('Score finalized!')}>
                          Approve Score
                        </button>
                        <button className="button outline" onClick={() => alert('Need more info requested.')}>
                          Flag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
