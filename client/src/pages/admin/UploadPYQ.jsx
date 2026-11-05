import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';

export default function UploadPYQ() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/subjects').then((res) => {
      setSubjects(res.data.subjects);
      if (res.data.subjects[0]) setSubjectId(res.data.subjects[0]._id);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !subjectId) return;
    setBusy(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('pdf', file);
    form.append('subjectId', subjectId);
    form.append('year', year);

    try {
      const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-slate">
          Add a subject first under <strong>Subjects & topics</strong> before uploading PYQs.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Upload PYQs</h1>
      <p className="text-sm text-slate mb-6">
        Upload a question-paper PDF. The AI will split it into individual questions and suggest a
        topic for each one -- review them afterwards in the Review queue before they go live.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="field-label">Subject</label>
          <select className="field-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Year / exam label (optional)</label>
          <input
            className="field-input"
            placeholder="e.g. 2023 or Winter 2022"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Question paper PDF</label>
          <input
            type="file"
            accept="application/pdf"
            required
            className="field-input"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-slate mt-1">
            Works best with text-based PDFs. Scanned/photographed papers may not extract cleanly.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy || !file} className="btn-primary">
          {busy ? 'Processing...' : 'Upload & extract questions'}
        </button>
      </form>

      {busy && <Loader label="Extracting questions and suggesting topics..." />}

      {result && (
        <div className="card mt-6">
          <p className="text-sm font-medium text-pine-dark mb-1">{result.message}</p>
          {result.enrichmentError && (
            <p className="text-sm text-amber-dark mb-2">{result.enrichmentError}</p>
          )}
          <a href="/admin/review" className="btn-secondary mt-2">Go to review queue</a>
        </div>
      )}
    </div>
  );
}
