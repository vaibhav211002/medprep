import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Navbar from '../../components/Navbar.jsx';
import Loader from '../../components/Loader.jsx';

function cleanMarkdown(text) {
  return (text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function AnswerText({ text }) {
  const lines = cleanMarkdown(text).split('\n');
  const blocks = [];
  let index = 0;
  const isBullet = (line) => /^\s*[-*+]\s+/.test(line);
  const isNumbered = (line) => /^\s*\d+[.)]\s+/.test(line);
  const isHeading = (line) => /^#{1,4}\s+/.test(line);
  const isTable = (line) => line.trim().startsWith('|') && line.indexOf('|', 1) >= 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (isHeading(line)) {
      blocks.push({ type: 'heading', text: line.replace(/^#{1,4}\s+/, '') });
      index += 1;
      continue;
    }
    if (isBullet(line) || isNumbered(line)) {
      const ordered = isNumbered(line);
      const items = [];
      while (index < lines.length && (ordered ? isNumbered(lines[index]) : isBullet(lines[index]))) {
        items.push(lines[index].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, '').trim());
        index += 1;
      }
      blocks.push({ type: ordered ? 'ordered' : 'list', items });
      continue;
    }
    if (isTable(line)) {
      const rows = [];
      while (index < lines.length && isTable(lines[index].trim())) {
        const cells = lines[index].trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isHeading(lines[index].trim()) &&
      !isBullet(lines[index]) && !isNumbered(lines[index]) && !isTable(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === 'heading') return <h4 key={i} className="pt-1 text-sm font-semibold text-pine-dark">{block.text}</h4>;
        if (block.type === 'list' || block.type === 'ordered') {
          const List = block.type === 'ordered' ? 'ol' : 'ul';
          return <List key={i} className={'space-y-1 pl-5 text-sm leading-relaxed text-ink ' + (block.type === 'ordered' ? 'list-decimal' : 'list-disc')}>
            {block.items.map((item, j) => <li key={j}>{item}</li>)}
          </List>;
        }
        if (block.type === 'table') return <div key={i} className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-pine-light"><tr>{block.rows[0].map((cell, j) => <th key={j} className="px-3 py-2 font-semibold text-pine-dark">{cell}</th>)}</tr></thead>
            <tbody className="divide-y divide-line bg-white">{block.rows.slice(1).map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k} className="px-3 py-2 align-top text-ink">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>;
        return <p key={i} className="text-sm leading-7 text-ink">{block.text}</p>;
      })}
    </div>
  );
}
// Single question card — handles MCQ and open-answer, your CSS untouched
function QuestionCard({ q, index, onReveal, cardRef, topicName }) {
  const isMCQ = q.options && q.options.length >= 2;
  const [chosen, setChosen] = useState(null);
  const [answer, setAnswer] = useState(null); // null | {loading} | {correctKey, explanation, error}

  async function fetchAnswer() {
    setAnswer({ loading: true });
    onReveal(q._id);
    try {
      const res = await api.post(`/ask/${q._id}`);
      setAnswer({
        correctKey: res.data.correctKey || null,
        explanation: res.data.answer || '',
        topicToLearn: res.data.topicToLearn || '',
        error: null,
      });
    } catch (err) {
      setAnswer({ error: err.response?.data?.message || 'Could not fetch an answer.' });
    }
  }

  async function handleOptionClick(key) {
    if (chosen) return;
    setChosen(key);
    await fetchAnswer();
  }

  const isCorrect = answer?.correctKey && chosen === answer.correctKey;
  const isWrong   = answer?.correctKey && chosen && chosen !== answer.correctKey;

  return (
    <div
      ref={cardRef}
      className="pyq-card scroll-mt-24"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className="text-xs rounded px-1.5 py-0.5 bg-[#E5EFE9] text-[#174C3C]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Q{index + 1}
        </span>
        {topicName && <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-slate">{topicName}</span>}
        <div className="flex gap-2 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {q.year && (
            <span className="rounded-full px-2 py-0.5 bg-[#E5EFE9] text-[#174C3C]">{q.year}</span>
          )}
          {q.marks != null && (
            <span className="rounded-full px-2 py-0.5 bg-[#F6EEDC] text-[#8F632D]">{q.marks} marks</span>
          )}
        </div>
      </div>

      {/* Question stem */}
      <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-[#25352E] mb-4">
        {q.questionText}
      </p>

      {/* MCQ options */}
      {isMCQ && (
        <div className="space-y-2 mb-3">
          {q.options.map((opt) => {
            const isThis         = chosen === opt.key;
            const revealCorrect  = answer?.correctKey === opt.key && chosen;

            let cls =
              'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ';

            if (!chosen) {
              cls += 'border-[#DCE5DE] bg-white hover:border-[#286B55] hover:bg-[#E5EFE9]/40 cursor-pointer';
            } else if (revealCorrect) {
              cls += 'border-[#286B55] bg-[#E5EFE9] text-[#174C3C] font-medium cursor-default';
            } else if (isThis && isWrong) {
              cls += 'border-red-400 bg-red-50 text-red-700 cursor-default';
            } else {
              cls += 'border-[#DCE5DE] bg-white text-[#718078] cursor-default opacity-60';
            }

            return (
              <button
                key={opt.key}
                onClick={() => handleOptionClick(opt.key)}
                disabled={!!chosen}
                className={cls}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mr-2 text-xs uppercase">
                  {opt.key})
                </span>
                {opt.text}
                {revealCorrect && (
                  <span className="ml-2 text-[#174C3C] text-xs font-semibold">✓ Correct</span>
                )}
                {isThis && isWrong && (
                  <span className="ml-2 text-red-600 text-xs font-semibold">✗ Wrong</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Open-answer button — only for non-MCQ */}
      {!isMCQ && !answer && (
        <button
          onClick={fetchAnswer}
          className="mt-4 inline-flex items-center rounded-lg bg-[#174C3C] px-4 py-2 text-sm font-medium text-white hover:bg-[#103B30] transition-colors focus:outline-none focus:ring-2 focus:ring-[#174C3C]/40"
        >
          Tell me the answer
        </button>
      )}

      {/* Loading */}
      {answer?.loading && (
        <div className="mt-4"><Loader label="Checking answer..." /></div>
      )}

      {/* Error */}
      {answer?.error && (
        <p className="text-sm text-red-600 mt-4">{answer.error}</p>
      )}

      {/* Result panel */}
      {answer && !answer.loading && !answer.error && (
        <div className="mt-4 rounded-xl overflow-hidden border border-[#DCE5DE]">
          {/* Correct answer banner */}
          {answer.correctKey && (
            <div className="bg-[#174C3C] text-white px-4 py-3 flex items-center gap-3">
              <span className="text-lg">{isCorrect ? '🎉' : '📖'}</span>
              <div>
                <p className="text-sm font-semibold">
                  {isCorrect
                    ? 'Your answer is correct. Well done!'
                    : 'That answer is incorrect.'}
                </p>
                <p className="text-sm mt-1">
                  Correct answer: {answer.correctKey.toUpperCase()}){' '}
                  {q.options?.find((o) => o.key === answer.correctKey)?.text || ''}
                </p>
                {!isCorrect && (
                  <p className="text-xs text-white/70 mt-0.5">Read the explanation below.</p>
                )}
              </div>
            </div>
          )}

          {/* Topic to learn and clinical reasoning */}
          <div className="border-l-2 border-[#C18B43] bg-[#F6EEDC]/50 px-4 py-3 space-y-3">
            {answer.topicToLearn && (
              <div>
                <p
                  className="text-xs uppercase tracking-wide text-[#8F632D] mb-1"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Topic to learn
                </p>
                <p className="text-sm font-medium text-[#25352E]">{answer.topicToLearn}</p>
              </div>
            )}
            <p
              className="text-xs uppercase tracking-wide text-[#8F632D] mb-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Why this answer
            </p>
            <AnswerText text={answer.explanation} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentHome() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState([]);
  const [totalQuestionCount, setTotalQuestionCount] = useState(0);
  const [topicId, setTopicId] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/subjects')
      .then((res) => {
        setSubjects(res.data.subjects);
        if (res.data.subjects[0]) setSubjectId(res.data.subjects[0]._id);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load subjects.'))
      .finally(() => setLoadingSubjects(false));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setLoadingTopics(true);
    setTopicId('all');
    setQuestions([]);
    setTopics([]);
    setTotalQuestionCount(0);
    api.get('/topics', { params: { subject: subjectId } })
      .then((res) => {
        setTopics(res.data.topics);
        setTotalQuestionCount(res.data.totalQuestionCount || 0);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load topics.'))
      .finally(() => setLoadingTopics(false));
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId || !topicId) return;
    setLoadingQuestions(true);
    setError('');
    api.get('/questions', { params: { subject: subjectId, topic: topicId } })
      .then((res) => setQuestions(res.data.questions))
      .catch((err) => setError(err.response?.data?.message || 'Could not load questions.'))
      .finally(() => setLoadingQuestions(false));
  }, [subjectId, topicId]);

  const selectedSubject = subjects.find((subject) => subject._id === subjectId);
  const selectedTopic = topics.find((topic) => topic._id === topicId);
  const visibleSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearch.trim().toLowerCase())
  );
  const visibleQuestions = questions.filter((question) => {
    const haystack = [question.questionText, ...(question.options || []).map((option) => option.text)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(questionSearch.trim().toLowerCase());
  });

  return (
    <div className="page-shell">
      <Navbar variant="student" />

      <header className="border-b border-line bg-gradient-to-br from-pine-light via-paper to-white">
        <div className="page-container py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">MedPrep question bank</p>
          <div className="mt-3 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-pine-dark sm:text-5xl">
                Your medical learning space
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate">
                Browse previous-year questions, practice each answer, and review focused explanations for your exam preparation.
              </p>
            </div>
            <a href="#subjects" className="btn-primary w-fit">Browse subjects <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </header>

      <main id="subjects" className="page-container py-8 sm:py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Question library</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Browse by subject and topic</h2>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loadingSubjects ? (
          <Loader label="Loading subjects..." />
        ) : subjects.length === 0 ? (
          <div className="card text-sm text-slate">No subjects have been added yet. Please check back soon.</div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="card !p-4 sm:!p-5">
              <div className="mb-4">
                <h3 className="font-display text-lg font-semibold text-ink">Subjects</h3>
                <p className="mt-1 text-xs text-slate">Choose an area to study.</p>
              </div>
              <label className="sr-only" htmlFor="subject-search">Search subjects</label>
              <input
                id="subject-search"
                className="field-input !py-2 text-sm"
                placeholder="Find a subject"
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
              />
              <nav className="mt-3 max-h-[420px] space-y-1 overflow-y-auto" aria-label="Subjects">
                {visibleSubjects.map((subject) => {
                  const active = subject._id === subjectId;
                  return (
                    <button
                      key={subject._id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => { setSubjectId(subject._id); setQuestionSearch(''); }}
                      className={'w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine ' +
                        (active ? 'bg-pine-light font-semibold text-pine-dark' : 'text-ink hover:bg-paper')}
                    >
                      {subject.name}
                    </button>
                  );
                })}
                {visibleSubjects.length === 0 && <p className="px-3 py-3 text-sm text-slate">No matching subjects.</p>}
              </nav>
            </aside>

            <section className="min-w-0" aria-label="Questions">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Selected subject</p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-ink">{selectedSubject?.name}</h3>
                <p className="mt-1 text-sm text-slate">Select a topic or choose all topics to browse the full set.</p>
              </div>

              <div className="card mb-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="topic-select">Topic</label>
                  <select
                    id="topic-select"
                    className="field-input"
                    value={topicId}
                    onChange={(event) => setTopicId(event.target.value)}
                    disabled={loadingTopics}
                  >
                    <option value="all">All topics ({totalQuestionCount})</option>
                    {topics.map((topic) => (
                      <option key={topic._id} value={topic._id}>
                        {topic.name} ({topic.questionCount} questions)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="question-search">Search questions</label>
                  <input
                    id="question-search"
                    className="field-input"
                    type="search"
                    placeholder="Search in this question set"
                    value={questionSearch}
                    onChange={(event) => setQuestionSearch(event.target.value)}
                  />
                </div>
              </div>

              {loadingTopics || loadingQuestions ? (
                <Loader label={loadingTopics ? 'Loading topics...' : 'Loading questions...'} />
              ) : questions.length === 0 ? (
                <div className="card text-sm text-slate">
                  No published questions are available for this selection yet.
                </div>
              ) : visibleQuestions.length === 0 ? (
                <div className="card text-sm text-slate">No questions match “{questionSearch}”. Try another search.</div>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate">
                    Showing {visibleQuestions.length} of {questions.length} questions
                    {selectedTopic ? ' in ' + selectedTopic.name : ''}
                  </p>
                  <div className="space-y-4">
                    {visibleQuestions.map((question, index) => (
                      <QuestionCard
                        key={question._id}
                        q={question}
                        index={index}
                        topicName={question.topic?.name || selectedTopic?.name}
                        onReveal={() => {}}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>

      <footer id="about" className="mt-10 border-t border-line bg-white">
        <div className="page-container flex flex-col gap-3 py-7 text-sm text-slate sm:flex-row sm:items-center sm:justify-between">
          <p><span className="font-display font-semibold text-pine-dark">MedPrep</span> · Previous-year medical questions</p>
          <a href="https://www.linkedin.com/in/vaibhav-bhatt-900b46210/" target="_blank" rel="noopener noreferrer" className="text-pine hover:underline">
            About the creator
          </a>
        </div>
      </footer>
    </div>
  );
}
