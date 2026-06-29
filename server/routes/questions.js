const express = require('express');
const Question = require('../models/Question');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

// Public: students browsing by subject + topic only ever see approved questions.
router.get('/', async (req, res) => {
  const { subject, topic } = req.query;
  if (!subject || !topic) {
    return res.status(400).json({ message: 'subject and topic query params are required.' });
  }
  const questions = await Question.find({ subject, topic, status: 'approved' })
    .select('-aiAnswer -correctOptionKey') // fetched lazily via /api/ask
    .sort({ year: -1, createdAt: -1 });
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
  if (options !== undefined) update.options = options;
  if (correctOptionKey !== undefined) update.correctOptionKey = correctOptionKey;
  if (aiAnswer !== undefined) update.aiAnswer = aiAnswer;

  const question = await Question.findByIdAndUpdate(req.params.id, update, { new: true }).populate(
    'topic',
    'name'
  );
  if (!question) return res.status(404).json({ message: 'Question not found.' });
  res.json({ question });
});

router.post('/bulk-approve', requireAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array is required.' });
  }
  // Only approve questions that already have a topic assigned.
  const result = await Question.updateMany(
    { _id: { $in: ids }, topic: { $ne: null } },
    { $set: { status: 'approved' } }
  );
  res.json({ message: `Approved ${result.modifiedCount} question(s).` });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const question = await Question.findByIdAndDelete(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found.' });
  res.json({ message: 'Question deleted.' });
});

module.exports = router;
