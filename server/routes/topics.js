const express = require('express');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

// Public: topics for a subject that actually have at least one approved
// question, so students never see an empty topic.
router.get('/', async (req, res) => {
  const { subject } = req.query;
  if (!subject) return res.status(400).json({ message: 'subject query param is required.' });

  const topicIds = await Question.distinct('topic', { subject, status: 'approved' });
  const topics = await Topic.find({ _id: { $in: topicIds } }).sort({ name: 1 });
  res.json({ topics });
});

// Admin: every topic for a subject, including ones with no approved questions yet.
router.get('/admin', requireAdmin, async (req, res) => {
  const { subject } = req.query;
  const filter = subject ? { subject } : {};
  const topics = await Topic.find(filter).sort({ name: 1 });
  res.json({ topics });
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, subject } = req.body;
    if (!name?.trim() || !subject) {
      return res.status(400).json({ message: 'name and subject are required.' });
    }
    const topic = await Topic.create({ name: name.trim(), subject });
    res.status(201).json({ topic });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This topic already exists for the subject.' });
    }
    res.status(500).json({ message: 'Could not create topic.', error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  const topic = await Topic.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
  if (!topic) return res.status(404).json({ message: 'Topic not found.' });
  res.json({ topic });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await Question.updateMany({ topic: req.params.id }, { $set: { topic: null, status: 'pending_review' } });
  await Topic.findByIdAndDelete(req.params.id);
  res.json({ message: 'Topic removed. Its questions were sent back to pending review.' });
});

module.exports = router;
