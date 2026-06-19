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
    <div className="grid sm:grid-cols-[260px_1fr] gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Subjects</h2>
        <ul className="space-y-1 mb-4">
          {subjects.map((s) => (
            <li key={s._id}>
              <button
                onClick={() => setSelected(s)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selected?._id === s._id ? 'bg-pine-light text-pine-dark font-medium' : 'hover:bg-pine-light/40'
                }`}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
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

      <div>
        {!selected ? (
          <div className="card text-sm text-slate">Add a subject to get started.</div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{selected.name}</h2>
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
