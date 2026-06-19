const axios = require('axios');

function client() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey || apiKey === 'your_xai_api_key_here') {
    const err = new Error(
      'XAI_API_KEY is not set. Add your Grok API key to server/.env to enable AI features.'
    );
    err.code = 'NO_API_KEY';
    throw err;
  }
  return axios.create({
    baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60_000,
  });
}

async function chatCompletion(messages, { jsonMode = false } = {}) {
  const http = client();
  const body = {
    model: process.env.GROK_MODEL || 'grok-4.3',
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
        `Question: ${questionText}\n\nProvide a clear, exam-ready answer.`,
    },
  ];

  return chatCompletion(messages, { jsonMode: false });
}

module.exports = { chatCompletion, classifyQuestionsByTopic, answerQuestion };
