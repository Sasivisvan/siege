"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/app-shell';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface ExamSummary {
  id: string;
  title: string;
  duration: number;
  points: number;
  createdAt: string;
}

interface ClassroomDetails {
  id: string;
  name: string;
  joinCode: string;
  teacher?: { name: string; email: string };
  students: string[];
  exams: ExamSummary[];
}

export default function ClassroomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [classroom, setClassroom] = useState<ClassroomDetails | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const fetchClassroom = async () => {
      try {
        const res = await apiFetch<{ data: { classroom: ClassroomDetails } }>(`/api/classrooms/${id}`);
        setClassroom(res.data.classroom);
      } catch (err: any) {
        setError(err.message || 'Failed to load classroom');
      } finally {
        setLoadingData(false);
      }
    };

    fetchClassroom();
  }, [id, isAuthenticated, isLoading]);

  if (isLoading || loadingData) {
    return <AppShell eyebrow="Classroom" title="Loading..." description="" />;
  }

  if (error || !classroom) {
    return (
      <AppShell eyebrow="Classroom Error" title="Could not load classroom" description="">
        <div className="card" style={{ borderColor: 'var(--destructive)', color: 'var(--destructive)' }}>
          {error || 'Classroom not found'}
        </div>
        <button onClick={() => router.push('/dashboard')} className="button" style={{ marginTop: 16 }}>
          Back to Dashboard
        </button>
      </AppShell>
    );
  }

  const isTeacher = user?.role === 'recruiter' || user?.role === 'admin';

  return (
    <AppShell
      eyebrow={isTeacher ? "Manage Classroom" : "Classroom"}
      title={classroom.name}
      description={isTeacher 
        ? `Join Code: ${classroom.joinCode} — Share this code with students.`
        : `Teacher: ${classroom.teacher?.name || 'Unknown'}`
      }
      primaryCta={isTeacher ? { label: "Create Exam", href: `/exams/create?classroomId=${classroom.id}` } : undefined}
    >
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.push('/dashboard')} className="button outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
          &larr; Back to Dashboard
        </button>
      </div>

      <h3>Exams</h3>
      {classroom.exams.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No exams have been added to this classroom yet.</p>
      ) : (
        <div className="stack" style={{ marginTop: 12 }}>
          {classroom.exams.map((exam) => (
            <article key={exam.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{exam.title}</strong>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {exam.duration} minutes
                </p>
              </div>
              {isTeacher ? (
                <button onClick={() => alert("Teacher analytics viewing is still under construction!")} className="button outline">
                  View Results
                </button>
              ) : (
                <button onClick={() => router.push(`/exam?id=${exam.id}`)} className="button primary">
                  Start Exam
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
