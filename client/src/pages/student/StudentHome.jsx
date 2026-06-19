import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client.js';
import Navbar from '../../components/Navbar.jsx';
import Loader from '../../components/Loader.jsx';
 
export default function StudentHome() {
  // ----------------------------------------------------------------------
  // Original logic — unchanged
  // ----------------------------------------------------------------------
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
 
  // ----------------------------------------------------------------------
  // Presentation-only additions (no business logic touched above)
  // ----------------------------------------------------------------------
 
  // Load display/body/mono fonts once.
  useEffect(() => {
    const id = 'medprep-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap';
    document.head.appendChild(link);
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);
 
  // Thin scroll-progress indicator.
  const [scrollPct, setScrollPct] = useState(0);
  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? (el.scrollTop / max) * 100 : 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
 
  // Auto-scroll a question's card into view when its answer is requested / arrives.
  const [activeId, setActiveId] = useState(null);
  const questionRefs = useRef({});
 
  function handleReveal(questionId) {
    setActiveId(questionId);
    revealAnswer(questionId);
  }
 
  useEffect(() => {
    if (!activeId) return;
    const node = questionRefs.current[activeId];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeId, answers[activeId]?.loading, answers[activeId]?.text, answers[activeId]?.error]);
 
  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      <style>{`
        @keyframes ecgDraw { from { stroke-dashoffset: 1400; } to { stroke-dashoffset: 0; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ecg-pulse-line { stroke-dasharray: 1400; animation: ecgDraw 2.2s ease-out forwards; }
        .fade-in-up { animation: fadeInUp 0.45s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .ecg-pulse-line { animation: none; stroke-dashoffset: 0; }
          .fade-in-up { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
 
      {/* Scroll progress */}
      <div
        className="fixed top-0 left-0 h-[3px] z-50 bg-gradient-to-r from-[#2A6F5C] to-[#D08A3C] transition-[width] duration-150 ease-out"
        style={{ width: `${scrollPct}%` }}
      />
 
      <Navbar variant="student" />
 
      {/* Banner */}
      <header className="relative overflow-hidden bg-[#1F4D40]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-9 sm:pt-14 sm:pb-12">
          <p
            className="text-[11px] tracking-[0.22em] uppercase text-[#BFE0D2] mb-3"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Previous Year Question Bank
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.05]"
            style={{ fontFamily: "'Lora', serif" }}
          >
            MedPrep
          </h1>
          <p
            className="mt-3 max-w-md text-sm sm:text-base text-[#D9ECE3] leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Helping medical students prepare with confidence — real past questions, clear answers.
          </p>
        </div>
 
        <svg
          className="absolute bottom-0 left-0 w-full h-7 sm:h-9 text-[#D08A3C]"
          viewBox="0 0 800 40"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <polyline
            className="ecg-pulse-line"
            points="0,20 130,20 150,20 160,4 172,36 184,20 320,20 460,20 480,20 490,4 502,36 514,20 650,20 800,20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.55"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </header>
 
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10" style={{ fontFamily: "'Inter', sans-serif" }}>
        <h2
          className="text-xl font-semibold text-[#16322B] mb-1"
          style={{ fontFamily: "'Lora', serif" }}
        >
          Browse questions
        </h2>
        <p className="text-sm text-[#5C6B65] mb-7 leading-relaxed">
          Pick a subject and a topic to browse past questions. Click "Tell me the answer" for an
          exam-ready, AI-generated explanation of any question.
        </p>
 
        {subjects.length === 0 ? (
          <div className="rounded-xl border border-[#E5E1D6] bg-white px-5 py-6 text-sm text-[#5C6B65]">
            No subjects have been added yet — check back soon.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-xs font-medium uppercase tracking-wide text-[#5C6B65] mb-1.5">
                Subject
              </label>
              <select
                className="w-auto min-w-[200px] rounded-lg border border-[#D2E5DD] bg-white px-3 py-2 text-sm text-[#16322B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A6F5C]/40 focus:border-[#2A6F5C] transition"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
 
            {loadingTopics ? (
              <Loader label="Loading topics..." />
            ) : topics.length === 0 ? (
              <div className="rounded-xl border border-[#E5E1D6] bg-white px-5 py-6 text-sm text-[#5C6B65]">
                No published questions for this subject yet.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-7">
                  {topics.map((t) => {
                    const active = topicId === t._id;
                    return (
                      <button
                        key={t._id}
                        onClick={() => setTopicId(t._id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[#2A6F5C]/40 ${
                          active
                            ? 'bg-[#1F4D40] border-[#1F4D40] text-white'
                            : 'bg-white border-[#D2E5DD] text-[#16322B] hover:border-[#2A6F5C]'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
 
                {loadingQuestions ? (
                  <Loader label="Loading questions..." />
                ) : questions.length === 0 ? (
                  <div className="rounded-xl border border-[#E5E1D6] bg-white px-5 py-6 text-sm text-[#5C6B65]">
                    No questions in this topic yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, i) => {
                      const state = answers[q._id];
                      return (
                        <div
                          key={q._id}
                          ref={(node) => {
                            questionRefs.current[q._id] = node;
                          }}
                          className="fade-in-up rounded-xl border border-[#E5E1D6] bg-white px-5 py-5 shadow-sm hover:shadow-md transition-shadow scroll-mt-24"
                          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <span
                              className="text-xs rounded px-1.5 py-0.5 bg-[#E7F1EC] text-[#1F4D40]"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              Q{i + 1}
                            </span>
                            <div className="flex gap-2 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {q.year && (
                                <span className="rounded-full px-2 py-0.5 bg-[#E7F1EC] text-[#1F4D40]">
                                  {q.year}
                                </span>
                              )}
                              {q.marks != null && (
                                <span className="rounded-full px-2 py-0.5 bg-[#FCEFDD] text-[#9C5E1F]">
                                  {q.marks} marks
                                </span>
                              )}
                            </div>
                          </div>
 
                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-[#16322B]">
                            {q.questionText}
                          </p>
 
                          {!state && (
                            <button
                              onClick={() => handleReveal(q._id)}
                              className="mt-4 inline-flex items-center rounded-lg bg-[#C2792A] px-4 py-2 text-sm font-medium text-white hover:bg-[#A8651E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2792A]/40"
                            >
                              Tell me the answer
                            </button>
                          )}
 
                          {state?.loading && (
                            <div className="mt-4">
                              <Loader label="Asking Grok..." />
                            </div>
                          )}
 
                          {state?.error && <p className="text-sm text-red-600 mt-4">{state.error}</p>}
 
                          {state?.text && (
                            <div className="mt-4 border-l-2 border-[#D08A3C] bg-[#FCEFDD]/50 rounded-r-md px-4 py-3">
                              <p
                                className="text-xs uppercase tracking-wide text-[#9C5E1F] mb-1"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                              >
                                Answer
                              </p>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-[#16322B]">
                                {state.text}
                              </p>
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
 
      {/* Footer */}
      <footer className="border-t border-[#E5E1D6] mt-16 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2 text-sm text-[#5C6B65]">
          <span style={{ fontFamily: "'Inter', sans-serif" }}>
            Made by <span className="font-medium text-[#16322B]">Galactico</span>
          </span>
          <a
            href="https://www.linkedin.com/in/vaibhav-bhatt-900b46210/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Vaibhav Bhatt on LinkedIn"
            className="inline-flex items-center justify-center w-6 h-6 rounded text-[#1F4D40] hover:text-[#C2792A] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zM8.5 8h3.83v2.05h.05c.53-1 1.84-2.05 3.79-2.05 4.06 0 4.81 2.67 4.81 6.14V23h-4v-6.78c0-1.62-.03-3.7-2.26-3.7-2.26 0-2.61 1.77-2.61 3.58V23h-4V8z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}