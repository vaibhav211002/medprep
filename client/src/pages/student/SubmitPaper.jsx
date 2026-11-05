import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Navbar from '../../components/Navbar.jsx';
import FileUpload from '../../components/FileUpload.jsx';

export default function SubmitPaper() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/subjects').then((res) => setSubjects(res.data.subjects));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');

    const form = new FormData();
    form.append('pdf', file);
    form.append('studentName', name);
    form.append('studentEmail', email);
    if (subjectId) form.append('subjectId', subjectId);
    form.append('note', note);

    try {
      const res = await api.post('/submissions', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.message);
      setName('');
      setEmail('');
      setNote('');
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar variant="student" />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <div className="page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine mb-2">Contribute to the library</p>
        <h1 className="page-title">Submit a question paper</h1>
        <p className="text-sm text-slate mt-2">
          Have a PYQ paper that's not in the bank yet? Upload it here along with your email and
          we'll add it once reviewed.
        </p>
        </div>

        {result ? (
          <div className="card">
            <p className="text-pine-dark font-medium">{result}</p>
            <button onClick={() => setResult(null)} className="btn-secondary mt-4">
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-5">
            <div>
              <label className="field-label">Your name (optional)</label>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="field-label">Your email</label>
              <input
                type="email"
                required
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Subject (optional)</label>
              <select className="field-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">-- Not sure / other --</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Note (optional)</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="e.g. 2024 University exam, semester 4"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="submission-pdf">Question paper PDF</label>
              <FileUpload id="submission-pdf" file={file} onFileChange={setFile} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={busy || !file} className="btn-primary w-full">
              {busy ? 'Submitting...' : 'Submit paper'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
