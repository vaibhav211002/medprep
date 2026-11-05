const express = require('express');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const { enrichQuestionsForReview, formatProviderError, cleanOptionText } = require('../utils/grokClient');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

// Public: students browsing by subject + topic only ever see approved questions.
router.get('/', async (req, res) => {
  const { subject, topic } = req.query;
  if (!subject || !topic) {
    return res.status(400).json({ message: 'subject and topic query params are required.' });
  }
  const filter = { subject, status: 'approved' };
  if (topic !== 'all') filter.topic = topic;
  const questions = await Question.find(filter)
    .select('-aiAnswer -correctOptionKey -aiAnswerLockToken -aiAnswerLockAt') // answer key is revealed only after a student answers
    .populate('topic', 'name')
    .sort({ year: -1, createdAt: -1 });
  questions.forEach((question) => {
    question.options = question.options.map((option) => ({
      key: option.key,
      text: cleanOptionText(option.text),
    }));
  });
  res.json({ questions });
});

// Admin: review queue / full management list.
router.get('/admin', requireAdmin, async (req, res) => {
  const { subject, status } = req.query;
  const filter = {};
  if (subject) filter.subject = subject;
  if (status) filter.status = status;
  const questions = await Question.find(filter)
    .populate('topic', 'name')
    .sort({ createdAt: -1 });
  res.json({ questions });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { questionText, topic, status, marks, year, options, correctOptionKey, aiAnswer } = req.body;
  const update = {};
  if (questionText !== undefined) update.questionText = questionText;
  if (topic !== undefined) update.topic = topic || null;
  if (status !== undefined) update.status = status;
  if (marks !== undefined) update.marks = marks;
  if (year !== undefined) update.year = year;
  if (options !== undefined) {
    if (!Array.isArray(options)) {
      return res.status(400).json({ message: 'Options must be an array.' });
    }
    if (options.length >= 2) {
      const nextKey = String(correctOptionKey || '').toLowerCase();
      const keys = options.map((option) => String(option.key || '').toLowerCase());
      if (!nextKey || !keys.includes(nextKey)) {
        return res.status(400).json({ message: 'Choose one of the saved options as the correct answer before saving.' });
      }
      if (new Set(keys).size !== keys.length || options.some((option) => !String(option.text || '').trim())) {
        return res.status(400).json({ message: 'Each option needs a unique key and non-empty text.' });
      }
    }
    update.options = options;
  }
  if (correctOptionKey !== undefined) {
    const normalizedKey = correctOptionKey ? String(correctOptionKey).toLowerCase() : null;
    const optionsForKey = options === undefined
      ? (await Question.findById(req.params.id).select('options'))?.options || []
      : options;
    if (optionsForKey.length >= 2 && (!normalizedKey || !optionsForKey.some((option) => option.key === normalizedKey))) {
      return res.status(400).json({ message: 'Correct answer must match one of the saved options.' });
    }
    update.correctOptionKey = normalizedKey;
  }
  if (questionText !== undefined || options !== undefined || correctOptionKey !== undefined) {
    update.aiAnswer = '';
    update.aiAnswerGeneratedAt = null;
    update.topicToLearn = '';
    update.aiAnswerLockToken = null;
    update.aiAnswerLockAt = null;
  }
  if (aiAnswer !== undefined) update.aiAnswer = aiAnswer;

  if (status === 'approved') {
    const current = await Question.findById(req.params.id).select('options correctOptionKey');
    if (!current) return res.status(404).json({ message: 'Question not found.' });
    const nextOptions = options === undefined ? current.options : options;
    const nextKey = correctOptionKey === undefined ? current.correctOptionKey : correctOptionKey;
    if (nextOptions?.length && !nextOptions.some((option) => option.key === nextKey)) {
      return res.status(400).json({ message: 'Select a correct answer from the saved options before approving this MCQ.' });
    }
  }

  const question = await Question.findByIdAndUpdate(req.params.id, update, { new: true }).populate(
    'topic',
    'name'
  );
  if (!question) return res.status(404).json({ message: 'Question not found.' });
  res.json({ question });
});

router.post('/:id/generate-options', requireAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('subject', 'name');
    if (!question) return res.status(404).json({ message: 'Question not found.' });

    const existingTopics = await Topic.find({ subject: question.subject._id }).select('name');
    const [result] = await enrichQuestionsForReview(
      question.subject.name,
      existingTopics.map((topic) => topic.name),
      [{ questionText: question.questionText, options: question.options || [] }]
    );

    if (!result.options || result.options.length !== 4 || !result.correctOptionKey) {
      return res.status(422).json({
        message: 'AI could not confidently create four choices and a correct answer. Add them manually or try again.',
      });
    }

    question.options = result.options;
    question.correctOptionKey = result.correctOptionKey;
    question.aiAnswer = result.explanation || '';
    question.aiAnswerGeneratedAt = question.aiAnswer ? new Date() : null;
    question.topicToLearn = result.topicToLearn || result.topicName || '';

    if (result.topicName) {
      let topic = existingTopics.find((item) => item.name.toLowerCase() === result.topicName.toLowerCase());
      if (!topic) {
        topic = await Topic.create({ name: result.topicName, subject: question.subject._id });
      } else {
        topic = await Topic.findById(topic._id);
      }
      question.topic = topic._id;
      question.suggestedTopicName = result.topicName;
    }

    await question.save();
    await question.populate('topic', 'name');
    res.json({ question, message: 'AI generated four options, selected an answer key, and assigned a topic.' });
  } catch (err) {
    console.error('QUESTION ENRICHMENT ERROR:', err.response?.data || err.message);
    const message = err.code === 'NO_API_KEY' ? err.message : formatProviderError(err);
    res.status(err.code === 'NO_API_KEY' ? 503 : (err.response?.status || 502)).json({ message });
  }
});

router.post('/bulk-approve', requireAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  // Only approve questions that have a topic and, for MCQs, a valid answer key.
  const eligible = await Question.find({ _id: { $in: ids }, topic: { $ne: null } }).select('options correctOptionKey');
  const eligibleIds = eligible
    .filter((q) => !q.options?.length || q.options.some((o) => o.key === q.correctOptionKey))
    .map((q) => q._id);
  const result = await Question.updateMany(
    { _id: { $in: eligibleIds }, topic: { $ne: null } },
    { $set: { status: 'approved' } }
  );
  res.json({ message: `Approved ${result.modifiedCount} question(s).${eligible.length > eligibleIds.length ? ` ${eligible.length - eligibleIds.length} MCQ(s) need a correct answer selected first.` : ''}` });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const question = await Question.findByIdAndDelete(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found.' });
  res.json({ message: 'Question deleted.' });
});

module.exports = router;
