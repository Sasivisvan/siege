// ============================================
// SIEGE Client — Exam Workspace (Live)
// ============================================

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { RiskMeter } from '@/components/proctoring/risk-meter';
import { useProctoring } from '@/hooks/useProctoring';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface Question {
  id: string;
  type: 'coding' | 'mcq' | 'aptitude';
  title: string;
  description: string;
  options?: string[];
  testCases?: Array<{ input: string; expectedOutput: string }>;
  points: number;
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
  settings: {
    webcamRequired: boolean;
    fullscreenRequired: boolean;
    copyPasteBlocked: boolean;
    tabSwitchLimit: number;
  };
}

interface ExamWorkspaceProps {
  examId: string;
}

export function ExamWorkspace({ examId }: ExamWorkspaceProps) {
  const { isAuthenticated } = useAuth();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hmacSecret, setHmacSecret] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'active' | 'submitted' | 'error'>('loading');
  const [error, setError] = useState('');

  // Proctoring
  const proctoring = useProctoring({
    sessionId,
    hmacSecret,
    enabled: status === 'active',
  });

  // Use a ref to prevent React 18 Strict Mode from double-firing the effect
  const hasStarted = useRef(false);

  // --- Start Exam Session ---
  useEffect(() => {
    if (!isAuthenticated || !examId) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function startSession() {
      try {
        const res = await apiFetch<{
          success: boolean;
          data: {
            sessionId: string;
            hmacSecret: string;
            exam: ExamData;
          };
        }>(`/api/exams/${examId}/start`, { method: 'POST' });

        setSessionId(res.data.sessionId);
        setHmacSecret(res.data.hmacSecret);
        setExam(res.data.exam);
        setTimeLeft(res.data.exam.duration * 60); // minutes → seconds
        setStatus('active');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start exam');
        setStatus('error');
      }
    }

    startSession();
  }, [isAuthenticated, examId]);

  // --- Countdown Timer ---
  useEffect(() => {
    if (status !== 'active' || timeLeft === null) return;

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [status, timeLeft]);

  // --- Auto-save Answer ---
  const saveAnswer = useCallback(async (questionId: string, value: string | number) => {
    if (!sessionId) return;

    const body: Record<string, unknown> = { sessionId, questionId };
    if (typeof value === 'string') {
      body.code = value;
    } else {
      body.selectedOption = value;
    }

    try {
      await apiFetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error('[ExamWorkspace] Auto-save failed:', err);
    }
  }, [sessionId]);

  // --- Submit Exam ---
  async function handleSubmit() {
    if (!sessionId || !exam) return;

    try {
      await apiFetch(`/api/exams/${exam.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      setStatus('submitted');
    } catch (err) {
      console.error('[ExamWorkspace] Submit failed:', err);
    }
  }

  // --- Format Timer ---
  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // --- Render ---

  if (status === 'loading') {
    return <section className="card"><h2>Loading exam...</h2></section>;
  }

  if (status === 'error') {
    return <section className="card"><h2>Error</h2><p>{error}</p></section>;
  }

  if (status === 'submitted') {
    return (
      <section className="card stack">
        <h2>Exam submitted ✅</h2>
        <p>Your answers have been recorded and plagiarism analysis is running in the background.</p>
        <a href="/dashboard" className="button primary">Go to dashboard</a>
      </section>
    );
  }

  if (!exam) return null;

  if (proctoring.isLocked) {
    return (
      <section className="card stack" style={{ textAlign: 'center', color: '#ef4444', marginTop: 40 }}>
        <h2>🔒 Session Locked</h2>
        <p>Your session has been locked due to suspicious activity (e.g. disconnected heartbeat or leaving the page).</p>
        <p>Please contact your instructor.</p>
        <a href="/dashboard" className="button">Return to Dashboard</a>
      </section>
    );
  }

  if (exam.settings.fullscreenRequired && !proctoring.isFullscreen) {
    return (
      <section className="card stack" style={{ textAlign: 'center', marginTop: 40 }}>
        <h2>⚠️ Fullscreen Required</h2>
        <p>This exam requires you to be in fullscreen mode. Exiting fullscreen will pause your exam.</p>
        <button 
          className="button primary" 
          onClick={() => document.documentElement.requestFullscreen?.().catch(console.error)}
          style={{ alignSelf: 'center' }}
        >
          Enter Fullscreen to Continue
        </button>
      </section>
    );
  }

  const question = exam.questions[currentQ];
  const questionId = question.id;

  return (
    <section className="workspace">
      {proctoring.tabSwitchCount > 0 && (
        <div style={{ background: '#ef4444', color: 'white', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 'bold' }}>
          ⚠️ Warning: You have switched tabs {proctoring.tabSwitchCount} time(s). Continuing to leave the exam window will result in your session being locked.
        </div>
      )}

      {/* Timer Bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{exam.title}</h3>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '1.2rem',
          color: timeLeft !== null && timeLeft < 300 ? '#ef4444' : 'var(--accent)',
        }}>
          ⏱ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
        </span>
      </div>

      <div className="workspace-grid">
        {/* Question Panel */}
        <article className="card stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Question {currentQ + 1} of {exam.questions.length}</h2>
            <span style={{ color: 'var(--muted)' }}>{question.points} pts</span>
          </div>

          <p>{question.description}</p>

          {question.type === 'coding' && (
            <textarea
              rows={16}
              value={(answers[questionId] as string) ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setAnswers((prev) => ({ ...prev, [questionId]: val }));
              }}
              onBlur={() => saveAnswer(questionId, answers[questionId] ?? '')}
              placeholder="Write your solution here..."
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
          )}

          {(question.type === 'mcq' || question.type === 'aptitude') && question.options && (
            <div className="stack">
              {question.options.map((opt, i) => (
                <label key={i} className="option-label" style={{
                  display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px',
                  borderRadius: 12, cursor: 'pointer',
                  background: answers[questionId] === i ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: `1px solid ${answers[questionId] === i ? 'var(--accent)' : 'var(--panel-border)'}`,
                }}>
                  <input
                    type="radio"
                    name={`q-${questionId}`}
                    checked={answers[questionId] === i}
                    onChange={() => {
                      setAnswers((prev) => ({ ...prev, [questionId]: i }));
                      saveAnswer(questionId, i);
                    }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="actions">
            <button
              className="button"
              disabled={currentQ === 0}
              onClick={() => setCurrentQ((c) => c - 1)}
            >
              ← Previous
            </button>

            {currentQ < exam.questions.length - 1 ? (
              <button
                className="button primary"
                onClick={() => setCurrentQ((c) => c + 1)}
              >
                Next →
              </button>
            ) : (
              <button
                className="button primary"
                onClick={handleSubmit}
              >
                Submit Exam
              </button>
            )}
          </div>
        </article>

        {/* Sidebar */}
        <div className="stack">
          <RiskMeter score={proctoring.riskScore} />

          <article className="card">
            <h3>Session Monitor</h3>
            <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', background: '#000', height: 120, position: 'relative' }}>
              {!proctoring.webcamReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  ⏳ Loading camera...
                </div>
              )}
              <video 
                ref={proctoring.videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
              />
            </div>
            <p>Fullscreen: {proctoring.isFullscreen ? '✅ active' : '⚠️ inactive'}</p>
            <p>Tab switches: {proctoring.tabSwitchCount}</p>
            {proctoring.isLocked && (
              <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: 8 }}>🔒 Session locked by proctor</p>
            )}
          </article>

          {/* Question Navigator */}
          <article className="card">
            <h3>Questions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {exam.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 600,
                    background: i === currentQ ? 'var(--accent-strong)' : answers[q.id] !== undefined ? 'rgba(56, 189, 248, 0.2)' : 'rgba(148, 163, 184, 0.12)',
                    color: i === currentQ ? '#000' : 'var(--text)',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
