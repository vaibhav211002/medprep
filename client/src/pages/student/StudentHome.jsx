import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Navbar from '../../components/Navbar.jsx';
import Loader from '../../components/Loader.jsx';

export default function StudentHome() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState({}); // { [questionId]: { loading, text, error } }

  useEffect(() => {
    api.get('/subjects').then((res) => {
      setSubjects(res.data.subjects);
      if (res.data.subjects[0]) setSubjectId(res.data.subjects[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setLoadingTopics(true);
    setTopicId('');
    setQuestions([]);
    api.get('/topics', { params: { subject: subjectId } }).then((res) => {
      setTopics(res.data.topics);
      if (res.data.topics[0]) setTopicId(res.data.topics[0]._id);
      setLoadingTopics(false);
    });
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId || !topicId) return;
    setLoadingQuestions(true);
    api.get('/questions', { params: { subject: subjectId, topic: topicId } }).then((res) => {
      setQuestions(res.data.questions);
      setLoadingQuestions(false);
    });
  }, [subjectId, topicId]);

  async function revealAnswer(questionId) {
    setAnswers((a) => ({ ...a, [questionId]: { loading: true } }));
    try {
      const res = await api.post(`/ask/${questionId}`);
      setAnswers((a) => ({ ...a, [questionId]: { loading: false, text: res.data.answer } }));
    } catch (err) {
      setAnswers((a) => ({
        ...a,
        [questionId]: { loading: false, error: err.response?.data?.message || 'Could not fetch an answer.' },
      }));
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar variant="student" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1">Previous Year Questions</h1>
        <p className="text-sm text-slate mb-6">
          Pick a subject and a topic to browse past questions. Click "Tell me the answer" to get an
          AI-generated, exam-ready answer for any question.
        </p>

        {subjects.length === 0 ? (
          <div className="card text-sm text-slate">No subjects have been added yet -- check back soon.</div>
        ) : (
          <>
            <div className="mb-5">
              <label className="field-label">Subject</label>
              <select
                className="field-input !w-auto"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {loadingTopics ? (
              <Loader label="Loading topics..." />
            ) : topics.length === 0 ? (
              <div className="card text-sm text-slate">No published questions for this subject yet.</div>
            ) : (
              <>
                <div className="tab-rail mb-6">
                  {topics.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => setTopicId(t._id)}
                      className={`tab-item ${topicId === t._id ? 'is-active' : ''}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>

                {loadingQuestions ? (
                  <Loader label="Loading questions..." />
                ) : questions.length === 0 ? (
                  <div className="card text-sm text-slate">No questions in this topic yet.</div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, i) => {
                      const state = answers[q._id];
                      return (
                        <div key={q._id} className="pyq-card">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="font-mono text-xs text-pine-dark bg-pine-light rounded px-1.5 py-0.5">
                              Q{i + 1}
                            </span>
                            <div className="flex gap-2 text-xs">
                              {q.year && <span className="year-tag">{q.year}</span>}
                              {q.marks != null && <span className="marks-tag">{q.marks} marks</span>}
                            </div>
                          </div>

                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line">
                            {q.questionText}
                          </p>

                          {!state && (
                            <button onClick={() => revealAnswer(q._id)} className="btn-amber mt-3">
                              Tell me the answer
                            </button>
                          )}

                          {state?.loading && <Loader label="Asking Grok..." />}

                          {state?.error && (
                            <p className="text-sm text-red-600 mt-3">{state.error}</p>
                          )}

                          {state?.text && (
                            <div className="mt-3 border-l-2 border-amber bg-amber-light/40 rounded-r-md px-4 py-3">
                              <p className="text-xs font-mono uppercase tracking-wide text-amber-dark mb-1">
                                Answer
                              </p>
                              <p className="text-sm leading-relaxed whitespace-pre-line">{state.text}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
