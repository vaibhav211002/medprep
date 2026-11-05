import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [subjectNameDraft, setSubjectNameDraft] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);
  const [error, setError] = useState('');

  async function loadSubjects() {
    const res = await api.get('/subjects');
    setSubjects(res.data.subjects);
    if (!selected && res.data.subjects[0]) setSelected(res.data.subjects[0]);
    setLoading(false);
  }

  useEffect(() => {
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get('/topics/admin', { params: { subject: selected._id } }).then((res) => setTopics(res.data.topics));
  }, [selected]);

  async function addSubject(e) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    const res = await api.post('/subjects', { name: newSubject.trim() });
    setNewSubject('');
    setSubjects((s) => [...s, res.data.subject].sort((a, b) => a.name.localeCompare(b.name)));
    setSelected(res.data.subject);
  }

  function beginEditSubject(subject) {
    setEditingId(subject._id);
    setSubjectNameDraft(subject.name);
    setError('');
  }

  async function saveSubjectName(e) {
    e.preventDefault();
    const name = subjectNameDraft.trim();
    if (!name) {
      setError('Subject name is required.');
      return;
    }
    setSavingSubject(true);
    setError('');
    try {
      const res = await api.put('/subjects/' + editingId, { name });
      setSubjects((current) => current
        .map((subject) => subject._id === editingId ? res.data.subject : subject)
        .sort((a, b) => a.name.localeCompare(b.name)));
      setSelected((current) => current?._id === editingId ? res.data.subject : current);
      setEditingId(null);
      setSubjectNameDraft('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not rename subject.');
    } finally {
      setSavingSubject(false);
    }
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject? This also deletes its topics and questions.')) return;
    await api.delete(`/subjects/${id}`);
    setSubjects((s) => s.filter((x) => x._id !== id));
    if (selected?._id === id) setSelected(null);
  }

  async function addTopic(e) {
    e.preventDefault();
    if (!newTopic.trim() || !selected) return;
    const res = await api.post('/topics', { name: newTopic.trim(), subject: selected._id });
    setTopics((t) => [...t, res.data.topic].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTopic('');
  }

  async function deleteTopic(id) {
    if (!confirm('Delete this topic? Its questions will go back to pending review.')) return;
    await api.delete(`/topics/${id}`);
    setTopics((t) => t.filter((x) => x._id !== id));
  }

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-pine">Question library</p>
        <h1 className="page-title">Subjects &amp; topics</h1>
        <p className="mt-2 text-sm text-slate">Organize the areas and topics used across your question bank.</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div>
        <div className="card !p-4 sm:!p-5">
        <h2 className="font-display text-xl font-semibold mb-1">Subjects</h2>
        <p className="mb-4 text-xs text-slate">Select a subject to manage its topics.</p>
        <ul className="space-y-1 mb-4">
          {subjects.map((s) => (
            <li key={s._id}>
              {editingId === s._id ? (
                <form onSubmit={saveSubjectName} className="flex gap-1 mb-1">
                  <input
                    autoFocus
                    className="field-input !py-1.5 text-sm min-w-0"
                    aria-label="Subject name"
                    value={subjectNameDraft}
                    onChange={(e) => setSubjectNameDraft(e.target.value)}
                  />
                  <button className="btn-secondary !py-1.5 text-xs" disabled={savingSubject}>
                    {savingSubject ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 text-xs"
                    onClick={() => { setEditingId(null); setError(''); }}
                    disabled={savingSubject}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
              <button
                onClick={() => setSelected(s)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selected?._id === s._id ? 'bg-pine-light text-pine-dark font-medium' : 'hover:bg-pine-light/40'
                }`}
              >
                {s.name}
              </button>
              )}
              {editingId !== s._id && (
                <button
                  type="button"
                  onClick={() => beginEditSubject(s)}
                  className="ml-3 text-xs text-pine-dark hover:underline"
                  aria-label={'Rename ' + s.name}
                  title="Rename subject"
                >
                  Rename
                </button>
              )}
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={addSubject} className="flex gap-2">
          <input
            className="field-input !py-1.5 text-sm"
            placeholder="New subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
          />
          <button className="btn-secondary !py-1.5">Add</button>
        </form>
        </div>
      </div>

      <div>
        {!selected ? (
          <div className="card text-sm text-slate">Add a subject to get started.</div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Selected subject</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{selected.name}</h2>
              </div>
              <button onClick={() => deleteSubject(selected._id)} className="text-sm text-red-600 hover:underline">
                Delete subject
              </button>
            </div>

            <h3 className="text-sm font-medium text-slate mb-2">Topics</h3>
            {topics.length === 0 ? (
              <p className="text-sm text-slate mb-3">
                No topics yet -- they'll be created automatically when you upload a PYQ PDF, or add one manually below.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2 mb-4">
                {topics.map((t) => (
                  <li key={t._id} className="year-tag !rounded-md !text-sm flex items-center gap-2 px-3 py-1.5">
                    {t.name}
                    <button onClick={() => deleteTopic(t._id)} className="text-pine-dark/60 hover:text-red-600">
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={addTopic} className="flex gap-2">
              <input
                className="field-input !py-1.5 text-sm"
                placeholder="New topic name"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
              />
              <button className="btn-secondary !py-1.5">Add topic</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
