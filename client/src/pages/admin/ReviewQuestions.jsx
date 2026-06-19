import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

export default function ReviewQuestions() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('pending_review');
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [newTopicFor, setNewTopicFor] = useState(null); // questionId currently adding a new topic
  const [newTopicName, setNewTopicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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

  async function approve(id) {
    await updateQuestion(id, { status: 'approved' });
    setQuestions((qs) => qs.filter((q) => q._id !== id || status === 'approved'));
  }

  async function reject(id) {
    await updateQuestion(id, { status: 'rejected' });
    setQuestions((qs) => qs.filter((q) => q._id !== id || status === 'rejected'));
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
        Confirm or fix the AI-suggested topic for each question, then approve it to publish on the
        student portal.
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
        <div className="card text-sm text-slate">Nothing here. Upload a PYQ PDF to get started.</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
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

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {q.year && <span className="year-tag">{q.year}</span>}
                    {q.marks != null && <span className="marks-tag">{q.marks} marks</span>}
                    {q.sourceFileName && <span className="text-slate font-mono">{q.sourceFileName}</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
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

                    <span className="ml-auto flex gap-2">
                      {q.status !== 'approved' && (
                        <button
                          onClick={() => approve(q._id)}
                          disabled={!q.topic}
                          title={!q.topic ? 'Assign a topic first' : 'Approve'}
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
                      <button onClick={() => remove(q._id)} className="btn-secondary !py-1.5 text-red-600">
                        Delete
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'pending_review' && questions.length > 0 && (
        <p className="text-xs text-slate mt-3">{selectableCount} of {questions.length} have a topic assigned and can be bulk-approved.</p>
      )}
    </div>
  );
}
