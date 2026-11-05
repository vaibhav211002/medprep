import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [subjects, topics, questions, pending, approved, submissions] = await Promise.all([
        api.get('/subjects'),
        api.get('/topics/admin'),
        api.get('/questions/admin'),
        api.get('/questions/admin', { params: { status: 'pending_review' } }),
        api.get('/questions/admin', { params: { status: 'approved' } }),
        api.get('/submissions', { params: { status: 'new' } }),
      ]);
      setStats({
        subjects: subjects.data.subjects.length,
        topics: topics.data.topics.length,
        questions: questions.data.questions.length,
        pending: pending.data.questions.length,
        approved: approved.data.questions.length,
        submissions: submissions.data.submissions.length,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the dashboard. Try again.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="card max-w-2xl">
        <p className="font-medium text-ink">Dashboard unavailable</p>
        <p className="mt-1 text-sm text-slate">{error}</p>
        <button className="btn-secondary mt-4" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!stats) return <Loader label="Loading dashboard..." />;

  const cards = [
    { label: 'Subjects', value: stats.subjects, to: '/admin/subjects' },
    { label: 'Topics', value: stats.topics, to: '/admin/subjects' },
    { label: 'Total questions', value: stats.questions, to: '/admin/review' },
    { label: 'Pending review', value: stats.pending, to: '/admin/review', tone: 'warning' },
    { label: 'Published questions', value: stats.approved, to: '/admin/review' },
    { label: 'New submissions', value: stats.submissions, to: '/admin/submissions', tone: 'warning' },
  ];

  return (
    <div>
      <div className="page-header">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-pine">Administration</p>
        <h1 className="page-title">Overview</h1>
        <p className="mt-2 text-sm text-slate">A live view of your MedPrep question bank.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Question bank statistics">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="card group !p-4 transition hover:-translate-y-0.5 hover:border-pine/40">
            <p className={'font-display text-3xl font-semibold ' + (card.tone === 'warning' ? 'text-amber-dark' : 'text-pine-dark')}>
              {card.value}
            </p>
            <p className="mt-1 text-xs leading-snug text-slate group-hover:text-ink">{card.label}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Recommended workflow</p>
          <h2 className="mt-2 text-xl font-semibold">Keep the question bank current</h2>
          <ol className="mt-5 space-y-4">
            {[
              ['01', 'Upload a paper', 'Extract questions and assign a subject.', '/admin/upload'],
              ['02', 'Review questions', 'Confirm topics and answer keys before publishing.', '/admin/review'],
              ['03', 'Manage your subjects', 'Organize topics and update subject names.', '/admin/subjects'],
            ].map(([number, title, text, to]) => (
              <li key={number} className="flex gap-3">
                <span className="font-mono text-xs text-pine">{number}</span>
                <div>
                  <Link to={to} className="text-sm font-semibold text-ink hover:text-pine">{title}</Link>
                  <p className="mt-0.5 text-sm text-slate">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-pine p-6 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Quick action</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Add a new question paper</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Upload a text-based PDF, then review the extracted questions before they go live.
          </p>
          <Link to="/admin/upload" className="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-pine-dark hover:bg-pine-light">
            Upload a paper
          </Link>
        </div>
      </section>
    </div>
  );
}
