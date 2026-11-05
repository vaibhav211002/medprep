import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Loader from '../../components/Loader.jsx';
import FileUpload from '../../components/FileUpload.jsx';

export default function UploadPYQ() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

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
    setProgress(0);

    const form = new FormData();
    form.append('pdf', file);
    form.append('subjectId', subjectId);
    form.append('year', year);

    try {
      const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
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
      <div className="max-w-3xl">
      <div className="page-header">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine mb-2">Question bank</p>
      <h1 className="page-title">Upload PYQs</h1>
      <p className="text-sm text-slate mt-2 max-w-2xl">
        Upload a question-paper PDF. The AI will split it into individual questions and suggest a
        topic for each one -- review them afterwards in the Review queue before they go live.
      </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
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
          <label className="field-label" htmlFor="pyq-pdf">Question paper PDF</label>
          <FileUpload id="pyq-pdf" file={file} onFileChange={setFile} />
          <p className="mt-2 text-xs leading-relaxed text-slate">Text-based PDFs extract best. Scanned or photographed papers may not parse cleanly.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy || !file} className="btn-primary">
          {busy ? 'Processing...' : 'Upload & extract questions'}
        </button>
      </form>

      {busy && (
        <div className="card mt-4">
          <div className="flex justify-between text-sm"><span className="font-medium text-ink">Uploading and processing</span><span className="font-mono text-slate">{progress}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-pine-light"><div className="h-full rounded-full bg-pine transition-[width]" style={{ width: progress + '%' }} /></div>
          <p className="mt-2 text-xs text-slate">Extracting questions and preparing them for review.</p>
        </div>
      )}

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
