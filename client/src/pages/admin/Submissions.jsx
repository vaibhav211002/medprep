import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

export default function Submissions() {
  const [submissions, setSubmissions] = useState(null);
  const [filter, setFilter] = useState('');

  async function load() {
    const res = await api.get('/submissions', { params: { status: filter || undefined } });
    setSubmissions(res.data.submissions);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function markReviewed(id) {
    await api.put(`/submissions/${id}`, { status: 'reviewed' });
    load();
  }

  async function download(sub) {
    const res = await api.get(`/submissions/${sub._id}/file`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = sub.fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Student submissions</h1>
      <p className="text-sm text-slate mb-6">Question papers students have sent in via the submission form.</p>

      <select className="field-input !w-auto mb-4" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All</option>
        <option value="new">New</option>
        <option value="reviewed">Reviewed</option>
      </select>

      {!submissions ? (
        <Loader />
      ) : submissions.length === 0 ? (
        <div className="card text-sm text-slate">No submissions yet.</div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s._id} className="card flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium">{s.studentName || 'Anonymous student'}</p>
                <p className="text-sm text-slate">{s.studentEmail}</p>
                {s.subject?.name && <span className="year-tag mt-1 inline-block">{s.subject.name}</span>}
                {s.note && <p className="text-sm text-slate mt-1">"{s.note}"</p>}
              </div>
              <span className={`marks-tag ${s.status === 'new' ? '!bg-amber-light !text-amber-dark' : ''}`}>
                {s.status}
              </span>
              <button onClick={() => download(s)} className="btn-secondary !py-1.5">Download PDF</button>
              {s.status === 'new' && (
                <button onClick={() => markReviewed(s._id)} className="btn-primary !py-1.5">
                  Mark reviewed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
