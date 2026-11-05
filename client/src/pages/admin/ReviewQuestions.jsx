import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

// Inline MCQ option editor — shown per question card in the review queue
function OptionsEditor({ question, onSave, onGenerate }) {
  // Build editable state from existing options or blank 4-slot template
  const init = ['a', 'b', 'c', 'd'].map((key) => {
    const existing = (question.options || []).find((o) => o.key === key);
    return { key, text: existing?.text || '' };
  });
  const [opts, setOpts] = useState(init);
  const [correctKey, setCorrectKey] = useState(question.correctOptionKey || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  function update(key, text) {
    setOpts((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)));
  }

  async function save() {
    const filled = opts.filter((o) => o.text.trim());
    if (filled.length < 2) {
      alert('Fill in at least 2 options (A and B minimum) before saving.');
      return;
    }
    if (filled.length && !filled.some((o) => o.key === correctKey)) {
      alert('Select which option is correct before saving.');
      return;
    }
    setSaving(true);
    // Clear the cached explanation when the options or answer key change.
    try {
      await onSave(filled, { aiAnswer: '', correctOptionKey: correctKey || null });
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const updated = await onGenerate();
      if (updated) {
        setOpts(['a', 'b', 'c', 'd'].map((key) => ({
          key,
          text: updated.options?.find((option) => option.key === key)?.text || '',
        })));
        setCorrectKey(updated.correctOptionKey || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate options. Try again or add them manually.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <p className="text-xs font-medium text-amber-800 mb-2">MCQ Options — edit or fill in below</p>
      <button onClick={generate} disabled={generating} className="btn-secondary !py-1.5 mb-2 text-xs">
        {generating ? 'Generating options and answer key...' : 'Generate options with AI'}
      </button>
      {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      <div className="space-y-1.5">
        {opts.map((o) => (
          <div key={o.key} className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate w-4 shrink-0 uppercase">{o.key})</span>
            <input
              className="field-input !py-1 text-sm"
              placeholder={`Option ${o.key.toUpperCase()}`}
              value={o.text}
              onChange={(e) => update(o.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="btn-amber !py-1.5 mt-2 text-xs">
        {saving ? 'Saving...' : 'Save options'}
      </button>
      {opts.some((o) => o.text.trim()) && (
        <label className="block mt-3 text-xs font-medium text-amber-900">
          Correct answer
          <select
            className="field-input !py-1.5 mt-1 text-sm"
            value={correctKey}
            onChange={(e) => setCorrectKey(e.target.value)}
          >
            <option value="">Select correct option</option>
            {opts.filter((o) => o.text.trim()).map((o) => (
              <option key={o.key} value={o.key}>{o.key.toUpperCase()}) {o.text}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export default function ReviewQuestions() {
  const [subjects, setSubjects]       = useState([]);
  const [subjectId, setSubjectId]     = useState('');
  const [status, setStatus]           = useState('pending_review');
  const [topics, setTopics]           = useState([]);
  const [questions, setQuestions]     = useState([]);
  const [selected, setSelected]       = useState(new Set());
  const [newTopicFor, setNewTopicFor] = useState(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingOptionsFor, setEditingOptionsFor] = useState(null); // questionId
  const [loading, setLoading]         = useState(true);
  const [message, setMessage]         = useState('');

  useEffect(() => {
    api.get('/subjects').then((res) => {
      setSubjects(res.data.subjects);
      if (res.data.subjects[0]) setSubjectId(res.data.subjects[0]._id);
    });
  }, []);

  async function load() {
    if (!subjectId) return;
    setLoading(true);
    const [qRes, tRes] = await Promise.all([
      api.get('/questions/admin', { params: { subject: subjectId, status: status || undefined } }),
      api.get('/topics/admin', { params: { subject: subjectId } }),
    ]);
    setQuestions(qRes.data.questions);
    setTopics(tRes.data.topics);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, status]);

  async function updateQuestion(id, patch) {
    const res = await api.put(`/questions/${id}`, patch);
    setQuestions((qs) => qs.map((q) => (q._id === id ? res.data.question : q)));
    return res.data.question;
  }

  async function handleTopicChange(question, value) {
    if (value === '__new__') {
      setNewTopicFor(question._id);
      setNewTopicName('');
      return;
    }
    await updateQuestion(question._id, { topic: value || null });
  }

  async function createTopicAndAssign(question) {
    if (!newTopicName.trim()) return;
    const res = await api.post('/topics', { name: newTopicName.trim(), subject: subjectId });
    setTopics((t) => [...t, res.data.topic].sort((a, b) => a.name.localeCompare(b.name)));
    await updateQuestion(question._id, { topic: res.data.topic._id });
    setNewTopicFor(null);
  }

  async function saveOptions(questionId, options, extra = {}) {
    await updateQuestion(questionId, { options, ...extra });
    setEditingOptionsFor(null);
  }

  async function approve(id) {
    await updateQuestion(id, { status: 'approved' });
    if (status === 'pending_review') {
      setQuestions((qs) => qs.filter((q) => q._id !== id));
    }
  }

  async function reject(id) {
    await updateQuestion(id, { status: 'rejected' });
    if (status !== 'rejected') {
      setQuestions((qs) => qs.filter((q) => q._id !== id));
    }
  }

  async function remove(id) {
    if (!confirm('Delete this question permanently?')) return;
    await api.delete(`/questions/${id}`);
    setQuestions((qs) => qs.filter((q) => q._id !== id));
  }

  async function bulkApprove() {
    if (selected.size === 0) return;
    const res = await api.post('/questions/bulk-approve', { ids: [...selected] });
    setMessage(res.data.message);
    await load();
  }

  function toggleSelect(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectableCount = useMemo(() => questions.filter((q) => q.topic).length, [questions]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Review queue</h1>
      <p className="text-sm text-slate mb-6">
        Confirm or fix the AI-suggested topic for each question, add MCQ options if missing, then
        approve to publish on the student portal.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="field-input !w-auto" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
        <select className="field-input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved (live)</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        {status === 'pending_review' && (
          <button onClick={bulkApprove} disabled={selected.size === 0} className="btn-amber ml-auto">
            Approve selected ({selected.size})
          </button>
        )}
      </div>

      {message && <p className="text-sm text-pine-dark mb-3">{message}</p>}

      {loading ? (
        <Loader />
      ) : questions.length === 0 ? (
        <div className="card text-sm text-slate">Nothing here yet — upload a PYQ PDF to get started.</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const hasMCQ = q.options && q.options.length >= 2;
            const isEditingOptions = editingOptionsFor === q._id;

            return (
              <div key={q._id} className="pyq-card">
                <div className="flex items-start gap-3">
                  {status === 'pending_review' && (
                    <input
                      type="checkbox"
                      className="mt-1.5"
                      checked={selected.has(q._id)}
                      onChange={() => toggleSelect(q._id)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Question text editor */}
                    <textarea
                      className="field-input mb-2 font-sans"
                      rows={3}
                      defaultValue={q.questionText}
                      onBlur={(e) => {
                        if (e.target.value !== q.questionText) {
                          updateQuestion(q._id, { questionText: e.target.value });
                        }
                      }}
                    />

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                      {q.year && <span className="year-tag">{q.year}</span>}
                      {q.marks != null && <span className="marks-tag">{q.marks} marks</span>}
                      {hasMCQ ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pine-light text-pine-dark text-xs font-mono font-medium px-2 py-0.5">
                          MCQ ✓ {q.options.length} options
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-light text-amber-dark text-xs font-mono font-medium px-2 py-0.5">
                          No options detected
                        </span>
                      )}
                      {hasMCQ && q.correctOptionKey && (
                        <span className="inline-flex items-center rounded-full bg-pine-light text-pine-dark text-xs font-medium px-2 py-0.5">
                          AI answer key: {q.correctOptionKey.toUpperCase()}
                        </span>
                      )}
                      {q.sourceFileName && (
                        <span className="text-slate font-mono">{q.sourceFileName}</span>
                      )}
                    </div>

                    {/* Current MCQ options preview */}
                    {hasMCQ && !isEditingOptions && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {q.options.map((o) => {
                          const isCorrect = o.key === q.correctOptionKey;
                          return (
                          <span
                            key={o.key}
                            className={isCorrect
                              ? 'text-xs rounded px-2 py-1 bg-pine-light border border-pine text-pine-dark font-medium'
                              : 'text-xs bg-surface border border-line rounded px-2 py-1'}
                          >
                            <span className="font-mono text-pine-dark uppercase">{o.key})</span> {o.text}
                            {isCorrect && <span className="ml-1 font-semibold">✓ Correct answer</span>}
                          </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Options editor (inline) */}
                    {isEditingOptions && (
                      <OptionsEditor
                        question={q}
                        onSave={(opts, extra) => saveOptions(q._id, opts, extra)}
                        onGenerate={async () => {
                          const res = await api.post('/questions/' + q._id + '/generate-options');
                          const assignedTopic = res.data.question.topic;
                          if (assignedTopic) {
                            setTopics((current) => current.some((topic) => topic._id === assignedTopic._id)
                              ? current
                              : [...current, assignedTopic].sort((a, b) => a.name.localeCompare(b.name)));
                          }
                          setQuestions((current) => current.map((item) => item._id === q._id ? res.data.question : item));
                          return res.data.question;
                        }}
                      />
                    )}

                    {/* Action row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Topic selector */}
                      <label className="flex items-center gap-2 text-xs font-medium text-slate">
                        Assigned topic
                        <select
                          className="field-input !w-auto !py-1.5 text-sm"
                          value={q.topic?._id || ''}
                          onChange={(e) => handleTopicChange(q, e.target.value)}
                        >
                          <option value="">-- No topic --</option>
                          {topics.map((t) => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                          ))}
                          <option value="__new__">+ New topic...</option>
                        </select>
                      </label>

                      {newTopicFor === q._id && (
                        <span className="flex items-center gap-2">
                          <input
                            autoFocus
                            className="field-input !w-44 !py-1.5 text-sm"
                            placeholder="Topic name"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                          />
                          <button className="btn-secondary !py-1.5" onClick={() => createTopicAndAssign(q)}>
                            Add
                          </button>
                        </span>
                      )}

                      {/* Edit/add options toggle */}
                      <button
                        onClick={() =>
                          setEditingOptionsFor(isEditingOptions ? null : q._id)
                        }
                        className="btn-secondary !py-1.5 text-xs"
                      >
                        {isEditingOptions ? 'Cancel' : hasMCQ ? 'Edit options' : '+ Add options'}
                      </button>

                      <span className="ml-auto flex gap-2">
                        {q.status !== 'approved' && (
                          <button
                            onClick={() => approve(q._id)}
                            disabled={!q.topic || (hasMCQ && !q.options.some((o) => o.key === q.correctOptionKey))}
                            title={!q.topic ? 'Assign a topic first' : hasMCQ && !q.correctOptionKey ? 'Set the correct answer first' : 'Approve'}
                            className="btn-amber !py-1.5"
                          >
                            Approve
                          </button>
                        )}
                        {q.status !== 'rejected' && (
                          <button onClick={() => reject(q._id)} className="btn-secondary !py-1.5">
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => remove(q._id)}
                          className="btn-secondary !py-1.5 text-red-600"
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status === 'pending_review' && questions.length > 0 && (
        <p className="text-xs text-slate mt-3">
          {selectableCount} of {questions.length} have a topic and can be bulk-approved.
        </p>
      )}
    </div>
  );
}
