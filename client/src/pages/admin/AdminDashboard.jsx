import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      const [subjects, pending, approved, newSubs] = await Promise.all([
        api.get('/subjects'),
        api.get('/questions/admin', { params: { status: 'pending_review' } }),
        api.get('/questions/admin', { params: { status: 'approved' } }),
        api.get('/submissions', { params: { status: 'new' } }),
      ]);
      setStats({
        subjects: subjects.data.subjects.length,
        pending: pending.data.questions.length,
        approved: approved.data.questions.length,
        newSubmissions: newSubs.data.submissions.length,
      });
    }
    load();
  }, []);

  if (!stats) return <Loader label="Loading dashboard..." />;

  const cards = [
    { label: 'Subjects', value: stats.subjects, to: '/admin/subjects', accent: 'pine' },
    { label: 'Pending review', value: stats.pending, to: '/admin/review', accent: 'amber' },
    { label: 'Live questions', value: stats.approved, to: '/admin/review', accent: 'pine' },
    { label: 'New submissions', value: stats.newSubmissions, to: '/admin/submissions', accent: 'amber' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Overview</h1>
      <p className="text-sm text-slate mb-6">A quick look at the question bank.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card hover:border-pine transition-colors">
            <div
              className={`text-3xl font-display font-semibold ${
                c.accent === 'amber' ? 'text-amber-dark' : 'text-pine-dark'
              }`}
            >
              {c.value}
            </div>
            <div className="text-sm text-slate mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-2">Typical workflow</h2>
        <ol className="text-sm text-slate space-y-2 list-decimal list-inside">
          <li>Add a subject under <Link to="/admin/subjects" className="text-pine-dark underline">Subjects & topics</Link>.</li>
          <li>Upload a PYQ PDF under <Link to="/admin/upload" className="text-pine-dark underline">Upload PYQs</Link> -- the AI extracts and topic-tags each question.</li>
          <li>Confirm or fix topics in the <Link to="/admin/review" className="text-pine-dark underline">Review queue</Link>, then approve. Approved questions go live for students immediately.</li>
          <li>Check <Link to="/admin/submissions" className="text-pine-dark underline">Student submissions</Link> for question papers students have sent in.</li>
        </ol>
      </div>
    </div>
  );
}
