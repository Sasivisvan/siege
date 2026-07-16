"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/ui/app-shell';
import { apiFetch } from '@/lib/api';

function CreateExamForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroomId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');

  const [questions, setQuestions] = useState([
    { title: '', description: '', type: 'coding', points: 10 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { title: '', description: '', type: 'coding', points: 10 }]);
  };

  const updateQuestion = (index: number, field: string, value: string | number) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/api/exams', {
        method: 'POST',
        body: JSON.stringify({
          classroomId,
          title,
          description,
          duration: parseInt(duration, 10),
          questions: questions.map(q => ({
            ...q,
            points: typeof q.points === 'string' ? parseInt(q.points, 10) : q.points
          }))
        })
      });
      router.push(classroomId ? `/classrooms/${classroomId}` : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create exam');
      setLoading(false);
    }
  };

  return (
    <AppShell eyebrow="Exams" title="Create a new exam" description="Define the settings and questions for your assessment.">
      <form onSubmit={handleSubmit} className="stack" style={{ maxWidth: 800 }}>
        {error && <div className="card" style={{ borderColor: 'var(--destructive)', color: 'var(--destructive)' }}>{error}</div>}

        <div className="card stack">
          <h3>Exam Details</h3>
          <div className="field">
            <label>Title</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Senior Frontend Engineer Test" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this exam about?" rows={3}></textarea>
          </div>
          <div className="field">
            <label>Duration (minutes)</label>
            <input type="number" required min="1" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>

        <div className="stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Questions</h3>
            <button type="button" onClick={addQuestion} className="button outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>+ Add Question</button>
          </div>

          {questions.map((q, index) => (
            <div key={index} className="card stack" style={{ position: 'relative' }}>
              <button 
                type="button" 
                onClick={() => removeQuestion(index)}
                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                disabled={questions.length === 1}
              >
                ✕
              </button>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label>Type</label>
                  <select value={q.type} onChange={e => updateQuestion(index, 'type', e.target.value)}>
                    <option value="coding">Coding Challenge</option>
                    <option value="mcq">Multiple Choice</option>
                    <option value="aptitude">Aptitude / Free Text</option>
                  </select>
                </div>
                <div className="field">
                  <label>Points</label>
                  <input type="number" required min="1" value={q.points} onChange={e => updateQuestion(index, 'points', e.target.value)} />
                </div>
              </div>
              
              <div className="field">
                <label>Question Title</label>
                <input type="text" required value={q.title} onChange={e => updateQuestion(index, 'title', e.target.value)} placeholder="e.g., Reverse a Linked List" />
              </div>
              <div className="field">
                <label>Question Description / Prompt</label>
                <textarea required value={q.description} onChange={e => updateQuestion(index, 'description', e.target.value)} placeholder="Provide the details of the problem..." rows={4}></textarea>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button type="submit" className="button primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creating...' : 'Create Exam'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

export default function CreateExamPage() {
  return (
    <Suspense fallback={<AppShell eyebrow="Exams" title="Loading..." description="" />}>
      <CreateExamForm />
    </Suspense>
  );
}
