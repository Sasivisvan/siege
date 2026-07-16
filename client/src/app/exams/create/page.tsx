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

  // Tabs: 'manual' | 'bulk-text' | 'excel' | 'ai'
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk-text' | 'excel' | 'ai'>('manual');

  // Importer states
  const [bulkText, setBulkText] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiCount, setAiCount] = useState('5');
  const [aiType, setAiType] = useState('mcq');

  const [questions, setQuestions] = useState<any[]>([
    { title: '', description: '', topic: 'General', difficulty: 'medium', type: 'mcq', points: 10, options: ['', '', '', ''], correctOption: 0 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { title: '', description: '', topic: 'General', difficulty: 'medium', type: 'mcq', points: 10, options: ['', '', '', ''], correctOption: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // --- Importers ---

  const handleBulkTextImport = () => {
    try {
      const blocks = bulkText.split(/\n\s*---\s*\n/);
      const parsed: any[] = [];
      
      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        let qTitle = '';
        let qDesc = '';
        let qTopic = 'General';
        let qDiff = 'medium';
        let qPoints = 10;
        const opts: string[] = [];
        let corrOpt = 0;

        for (const line of lines) {
          if (line.startsWith('Q:')) {
            qTitle = line.replace(/^Q:\s*/, '');
          } else if (line.startsWith('Topic:')) {
            qTopic = line.replace(/^Topic:\s*/, '');
          } else if (line.startsWith('Difficulty:')) {
            qDiff = line.replace(/^Difficulty:\s*/, '').toLowerCase();
          } else if (line.startsWith('Points:')) {
            qPoints = parseInt(line.replace(/^Points:\s*/, ''), 10) || 10;
          } else if (line.match(/^[A-D][\.\)]/)) {
            let optVal = line.replace(/^[A-D][\.\)]\s*/, '');
            if (optVal.endsWith('*')) {
              corrOpt = opts.length;
              optVal = optVal.slice(0, -1).trim();
            }
            opts.push(optVal);
          } else {
            qDesc = qDesc ? qDesc + '\n' + line : line;
          }
        }

        if (qTitle) {
          parsed.push({
            title: qTitle,
            description: qDesc,
            topic: qTopic,
            difficulty: qDiff,
            type: opts.length > 0 ? 'mcq' : 'coding',
            points: qPoints,
            options: opts.length > 0 ? opts : ['', '', '', ''],
            correctOption: corrOpt,
          });
        }
      }

      if (parsed.length === 0) {
        throw new Error('Could not parse any valid questions. Check format.');
      }

      setQuestions(parsed);
      setActiveTab('manual');
      setBulkText('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse text.');
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const imported = data.map(row => {
          const opts = [
            row['Option A'] || row['OptionA'] || '',
            row['Option B'] || row['OptionB'] || '',
            row['Option C'] || row['OptionC'] || '',
            row['Option D'] || row['OptionD'] || ''
          ].filter(Boolean);

          let correctIndex = 0;
          const correct = String(row['Correct Option'] || row['CorrectOption'] || 'A').toUpperCase();
          if (correct === 'B' || correct === '1') correctIndex = 1;
          else if (correct === 'C' || correct === '2') correctIndex = 2;
          else if (correct === 'D' || correct === '3') correctIndex = 3;

          return {
            title: row['Title'] || row['Question'] || 'Untitled',
            description: row['Description'] || row['Prompt'] || '',
            topic: row['Topic'] || 'General',
            difficulty: (row['Difficulty'] || 'medium').toLowerCase(),
            type: (row['Type'] || 'mcq').toLowerCase(),
            points: parseInt(row['Points'], 10) || 10,
            options: opts.length > 0 ? opts : ['', '', '', ''],
            correctOption: correctIndex
          };
        });

        if (imported.length > 0) {
          setQuestions(imported);
          setActiveTab('manual');
        }
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      setError('Failed to read Excel file.');
    }
  };

  const handleGenerateAIQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      // Mock generated list for styling or fallback to Ollama/LLM router
      const count = parseInt(aiCount, 10) || 3;
      const generated: any[] = [];
      for (let i = 1; i <= count; i++) {
        generated.push({
          title: `AI Prompt - ${aiTopic} Diagnostic Q${i}`,
          description: `Analyze the foundational components of ${aiTopic} and evaluate correctness.`,
          topic: aiTopic || 'General',
          difficulty: aiDifficulty,
          type: aiType,
          points: 10,
          options: aiType !== 'coding' ? ['Choice Alpha', 'Choice Beta', 'Choice Gamma', 'Choice Delta'] : ['', '', '', ''],
          correctOption: 0
        });
      }
      setQuestions(generated);
      setActiveTab('manual');
    } catch (err) {
      setError('AI generation service currently unavailable.');
    } finally {
      setLoading(false);
    }
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

        {/* --- Creation Tabs --- */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
          <button type="button" className={`button ${activeTab === 'manual' ? 'primary' : ''}`} onClick={() => setActiveTab('manual')}>Manual Creator</button>
          <button type="button" className={`button ${activeTab === 'bulk-text' ? 'primary' : ''}`} onClick={() => setActiveTab('bulk-text')}>Bulk Text Importer</button>
          <button type="button" className={`button ${activeTab === 'excel' ? 'primary' : ''}`} onClick={() => setActiveTab('excel')}>Upload Excel/CSV</button>
          <button type="button" className={`button ${activeTab === 'ai' ? 'primary' : ''}`} onClick={() => setActiveTab('ai')}>AI Generator</button>
        </div>

        {activeTab === 'manual' && (
          <div className="stack">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Questions ({questions.length})</h3>
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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="field">
                    <label>Type</label>
                    <select value={q.type} onChange={e => updateQuestion(index, 'type', e.target.value)}>
                      <option value="mcq">Multiple Choice</option>
                      <option value="aptitude">Aptitude</option>
                      <option value="coding">Coding</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Topic</label>
                    <input type="text" value={q.topic} onChange={e => updateQuestion(index, 'topic', e.target.value)} placeholder="e.g., Arrays" />
                  </div>
                  <div className="field">
                    <label>Points</label>
                    <input type="number" required min="1" value={q.points} onChange={e => updateQuestion(index, 'points', e.target.value)} />
                  </div>
                </div>
                
                <div className="field">
                  <label>Question Title</label>
                  <input type="text" required value={q.title} onChange={e => updateQuestion(index, 'title', e.target.value)} placeholder="e.g., What is React?" />
                </div>
                <div className="field">
                  <label>Question Description / Prompt</label>
                  <textarea required value={q.description} onChange={e => updateQuestion(index, 'description', e.target.value)} placeholder="Provide the details of the problem..." rows={2}></textarea>
                </div>
                
                {q.type !== 'coding' ? (
                  <div className="field">
                    <label>Options</label>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {q.options.map((opt: string, oIndex: number) => (
                        <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="radio" 
                            name={`correct-${index}`} 
                            checked={q.correctOption === oIndex} 
                            onChange={() => updateQuestion(index, 'correctOption', oIndex)} 
                            title="Select as correct answer"
                          />
                          <input 
                            type="text" 
                            required 
                            value={opt} 
                            onChange={e => updateOption(index, oIndex, e.target.value)} 
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`} 
                            style={{ flex: 1 }}
                          />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Select the radio button next to the correct option.</p>
                  </div>
                ) : (
                  <div className="field">
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Coding questions do not use multiple choice options. Test cases can be configured after creation.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bulk-text' && (
          <div className="card stack">
            <h3>Bulk Text Importer</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Paste questions formatted as:
            </p>
            <pre style={{ fontSize: '0.8rem', background: '#000', padding: '12px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
{`Q: What is React?
Topic: React
Difficulty: easy
Description: React is a JS library for building UI.
A) Library*
B) Framework
C) Language
D) Database
---
Q: Describe closures
Topic: JS
Description: Closures are function scopes.`}
            </pre>
            <textarea 
              value={bulkText} 
              onChange={e => setBulkText(e.target.value)} 
              placeholder="Paste questions here..." 
              rows={8}
            />
            <button type="button" onClick={handleBulkTextImport} className="button primary">Parse and Import Questions</button>
          </div>
        )}

        {activeTab === 'excel' && (
          <div className="card stack">
            <h3>Upload Excel or CSV Sheet</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Ensure your columns match: <strong>Title</strong>, <strong>Description</strong>, <strong>Topic</strong>, <strong>Difficulty</strong>, <strong>Type</strong>, <strong>Points</strong>, <strong>Option A</strong>, <strong>Option B</strong>, <strong>Option C</strong>, <strong>Option D</strong>, <strong>Correct Option</strong>.
            </p>
            <div style={{ padding: '24px', border: '2px dashed var(--panel-border)', borderRadius: '8px', textAlign: 'center' }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} />
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="card stack">
            <h3>AI Question Bank Generator</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label>Topic / Subject</label>
                <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g., Python Lists" />
              </div>
              <div className="field">
                <label>Question Type</label>
                <select value={aiType} onChange={e => setAiType(e.target.value)}>
                  <option value="mcq">Multiple Choice</option>
                  <option value="aptitude">Aptitude</option>
                  <option value="coding">Coding</option>
                </select>
              </div>
              <div className="field">
                <label>Difficulty</label>
                <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" min="1" max="10" value={aiCount} onChange={e => setAiCount(e.target.value)} />
              </div>
            </div>
            <button type="button" onClick={handleGenerateAIQuestions} className="button primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        )}

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
