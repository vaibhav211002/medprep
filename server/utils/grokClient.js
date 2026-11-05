const axios = require('axios');

function client() {
  const groqKey = process.env.GROQ_API_KEY;
  const apiKey = groqKey || process.env.XAI_API_KEY;
  if (!apiKey || apiKey === 'your_xai_api_key_here') {
    const err = new Error(
      'Set GROQ_API_KEY for Groq or XAI_API_KEY for xAI in the backend environment.'
    );
    err.code = 'NO_API_KEY';
    throw err;
  }
  const baseURL = process.env.GROQ_BASE_URL || process.env.XAI_BASE_URL ||
    (groqKey ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1');
  return axios.create({
    baseURL: baseURL.replace(/\/+$/, '').replace(/\/chat\/completions$/i, ''),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60_000,
  });
}

function formatProviderError(err) {
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.response?.data?.message;
  if (status) return 'AI provider returned HTTP ' + status + (detail ? ': ' + detail : '.');
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return 'AI provider request timed out. Check the server connection and retry.';
  }
  return 'AI request failed: ' + (err.message || 'unknown error');
}

function cleanOptionText(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/\b[\w-]*(?:firstranker|ranker|examrace|studocu)[\w.-]*/gi, ' ')
    .replace(/\*{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function chatCompletion(messages, { jsonMode = false } = {}) {
  const http = client();
  const configuredBase = process.env.GROQ_BASE_URL || process.env.XAI_BASE_URL || '';
  const isGroq = Boolean(process.env.GROQ_API_KEY) || configuredBase.includes('groq.com');
  const body = {
    model: process.env.GROQ_MODEL || process.env.GROK_MODEL ||
      (isGroq ? 'openai/gpt-oss-120b' : 'grok-4.3'),
    messages,
    temperature: 0.2,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const { data } = await http.post('/chat/completions', body);
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Ask Grok to assign each question to a topic for the given subject,
 * preferring an existing topic name when it genuinely fits, and only
 * suggesting a new topic name when nothing existing applies.
 * Returns an array of topic name strings, same order/length as `questions`.
 */
async function classifyQuestionsByTopic(subjectName, existingTopicNames, questions) {
  const list = questions
    .map((q, i) => `${i + 1}. ${q.questionText.slice(0, 600)}`)
    .join('\n\n');

  const messages = [
    {
      role: 'system',
      content:
        'You are helping organize a medical exam question bank by topic. ' +
        'Respond with ONLY a JSON object, no commentary, no markdown fences.',
    },
    {
      role: 'user',
      content:
        `Subject: ${subjectName}\n` +
        `Existing topics for this subject: ${
          existingTopicNames.length ? existingTopicNames.join(', ') : '(none yet)'
        }\n\n` +
        `For each numbered question below, assign ONE short topic name (2-5 words, ` +
        `e.g. "Cardiac Cycle", "Renal Physiology"). Reuse an existing topic whenever it ` +
        `genuinely fits, instead of creating a near-duplicate. Only invent a new topic ` +
        `name when nothing existing applies.\n\n` +
        `Questions:\n${list}\n\n` +
        `Respond as JSON: {"topics": ["topic for question 1", "topic for question 2", ...]}`,
    },
  ];

  const raw = await chatCompletion(messages, { jsonMode: true });
  const parsed = JSON.parse(raw);
  const topics = Array.isArray(parsed.topics) ? parsed.topics : [];

  // Pad/truncate defensively so the array always lines up with `questions`.
  while (topics.length < questions.length) topics.push('Uncategorized');
  return topics.slice(0, questions.length).map((t) => String(t).trim());
}

/**
 * Suggest a topic and complete MCQ data for each extracted question.
 * Existing PDF choices are preserved; AI only supplies a key for those.
 */
async function enrichQuestionsForReview(subjectName, existingTopicNames, questions) {
  const results = [];
  const batchSize = 8;

  for (let start = 0; start < questions.length; start += batchSize) {
    const batch = questions.slice(start, start + batchSize);
    const inputs = batch.map((q, offset) => ({
      index: start + offset,
      question: q.questionText.slice(0, 1200),
      extractedOptions: q.options || [],
    }));
    const messages = [
      {
        role: 'system',
        content: 'You are an expert medical exam question editor. Return only valid JSON, with no markdown.',
      },
      {
        role: 'user',
        content:
          'Subject: ' + subjectName + '\nExisting topic names: ' +
          (existingTopicNames.join(', ') || '(none)') + '\n\n' +
          'For each question, assign the most specific concise topic (2-5 words). ' +
          'Provide exactly four choices with keys a, b, c, d and one correctOptionKey. ' +
          'If extractedOptions exist, preserve their keys and wording exactly and identify the correct answer. ' +
          'If no choices were extracted, create four plausible choices with exactly one correct answer. ' +
          'Do not include websites, publisher names, citations, decorative symbols, or non-medical text in choices. ' +
          'For each question, explain why the correct choice is correct and specifically why each other choice is wrong. ' +
          'Also provide a focused topicToLearn phrase. If you cannot confidently determine the answer, use empty options and null correctOptionKey. ' +
          'Return {"questions":[{"index":0,"topic":"...","topicToLearn":"...","options":[{"key":"a","text":"..."}],"correctOptionKey":"a","explanation":"..."}]}.\n\n' +
          JSON.stringify(inputs),
      },
    ];
    const raw = await chatCompletion(messages, { jsonMode: true });
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed.questions) ? parsed.questions : [];

    for (let offset = 0; offset < batch.length; offset++) {
      const index = start + offset;
      const row = rows.find((item) => item.index === index) || rows[offset] || {};
      const fromPdf = batch[offset].options || [];
      const candidate = fromPdf.length ? fromPdf : (Array.isArray(row.options) ? row.options : []);
      const options = candidate
        .filter((item) => item && /^[a-d]$/i.test(String(item.key || '')) && String(item.text || '').trim())
        .map((item) => ({ key: String(item.key).toLowerCase(), text: cleanOptionText(item.text) }))
        .filter((item) => item.text);
      const keys = new Set(options.map((item) => item.key));
      const hasFourChoices = options.length === 4 && ['a', 'b', 'c', 'd'].every((key) => keys.has(key));
      const proposedKey = String(row.correctOptionKey || '').toLowerCase();
      const hasValidKey = keys.has(proposedKey) && (fromPdf.length ? options.length >= 2 : hasFourChoices);

      results.push({
        topicName: String(row.topic || '').trim(),
        topicToLearn: String(row.topicToLearn || row.topic || '').trim(),
        explanation: String(row.explanation || '')
          .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
          .replace(/\*{2,}/g, '')
          .trim(),
        options,
        correctOptionKey: hasValidKey ? proposedKey : null,
      });
    }
  }

  return results;
}

/**
 * Ask Grok to answer a single PYQ question for a student.
 */
async function answerQuestion(subjectName, topicName, questionText) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a medical education tutor helping a medical student prepare for exams. ' +
        'Give clear, accurate, exam-oriented answers using standard medical terminology. ' +
        'Structure longer answers with short headings or bullet points where it helps revision.',
    },
    {
      role: 'user',
      content:
        `Subject: ${subjectName}\nTopic: ${topicName || 'General'}\n\n` +
        `Question: ${questionText}\n\nProvide a clear, exam-ready answer.Remove the * and # symbols so that it looks like human written.`,
    },
  ];

  return chatCompletion(messages, { jsonMode: false });
}

module.exports = { chatCompletion, classifyQuestionsByTopic, enrichQuestionsForReview, answerQuestion, formatProviderError, cleanOptionText };
