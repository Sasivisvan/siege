"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/ui/app-shell';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface ClassroomSummary {
  id: string;
  name: string;
  joinCode: string;
  teacher?: { name: string; email: string };
  students: string[];
  exams: string[];
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Student join state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Teacher create state
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    fetchClassrooms();
  }, [isAuthenticated, isLoading]);

  const fetchClassrooms = async () => {
    setLoadingData(true);
    try {
      const res = await apiFetch<{ data: { classrooms: ClassroomSummary[] } }>('/api/classrooms');
      setClassrooms(res.data.classrooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinLoading(true);
    try {
      await apiFetch('/api/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode })
      });
      setJoinCode('');
      fetchClassrooms(); // Refresh list
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join classroom');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await apiFetch('/api/classrooms', {
        method: 'POST',
        body: JSON.stringify({ name: createName })
      });
      setCreateName('');
      fetchClassrooms(); // Refresh list
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create classroom');
    } finally {
      setCreateLoading(false);
    }
  };

  if (isLoading || loadingData) {
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

  // ==========================================
  // STUDENT VIEW
  // ==========================================
  if (user?.role === 'candidate') {
    return (
      <AppShell
        eyebrow="Student Dashboard"
        title={`Welcome, ${user.name}`}
        description="Join a classroom to access your exams."
      >
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Join a Classroom</h3>
          <form onSubmit={handleJoinClassroom} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <input 
                type="text" 
                placeholder="Enter 6-digit Join Code" 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                required 
                maxLength={6}
              />
            </div>
            <button type="submit" className="button primary" disabled={joinLoading}>
              {joinLoading ? 'Joining...' : 'Join'}
            </button>
          </form>
          {joinError && <p style={{ color: 'var(--destructive)', marginTop: 8 }}>{joinError}</p>}
        </div>

        <h3>Your Classrooms</h3>
        {classrooms.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>You haven't joined any classrooms yet.</p>
        ) : (
          <div className="stack" style={{ marginTop: 12 }}>
            {classrooms.map((c) => (
              <article key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{c.name}</strong>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Teacher: {c.teacher?.name || 'Unknown'}
                  </p>
                </div>
                <button onClick={() => router.push(`/classrooms/${c.id}`)} className="button">
                  Enter Classroom
                </button>
              </article>
            ))}
          </div>
        )}
      </AppShell>
    );
  }

  // ==========================================
  // TEACHER (RECRUITER/ADMIN) VIEW
  // ==========================================
  return (
    <AppShell
      eyebrow="Teacher Dashboard"
      title={`Welcome back, ${user?.name}`}
      description="Manage your classrooms and exams."
    >
      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Create a Classroom</h3>
        <form onSubmit={handleCreateClassroom} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <input 
              type="text" 
              placeholder="e.g., Intro to Computer Science (CS101)" 
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="button primary" disabled={createLoading}>
            {createLoading ? 'Creating...' : 'Create'}
          </button>
        </form>
        {createError && <p style={{ color: 'var(--destructive)', marginTop: 8 }}>{createError}</p>}
      </div>

      <h3>Your Classrooms</h3>
      {classrooms.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>You haven't created any classrooms yet.</p>
      ) : (
        <div className="stack" style={{ marginTop: 12 }}>
          {classrooms.map((c) => (
            <article key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{c.name}</strong>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Join Code: <span style={{ fontWeight: 700, letterSpacing: 1, color: 'var(--accent)' }}>{c.joinCode}</span> · {c.students.length} Students
                </p>
              </div>
              <button onClick={() => router.push(`/classrooms/${c.id}`)} className="button">
                Manage
              </button>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
