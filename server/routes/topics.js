const express = require('express');
const mongoose = require('mongoose');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

// Public: topics for a subject that actually have at least one approved
// question, so students never see an empty topic.
router.get('/', async (req, res) => {
  const { subject } = req.query;
  if (!subject) return res.status(400).json({ message: 'subject query param is required.' });

  if (!mongoose.Types.ObjectId.isValid(subject)) {
    return res.status(400).json({ message: 'subject must be a valid id.' });
  }
  const [topics, totalQuestionCount] = await Promise.all([
    Question.aggregate([
    {
      $match: {
        subject: new mongoose.Types.ObjectId(subject),
        status: 'approved',
        topic: { $ne: null },
      },
    },
    { $group: { _id: '$topic', questionCount: { $sum: 1 } } },
    {
      $lookup: {
        from: 'topics',
        localField: '_id',
        foreignField: '_id',
        as: 'topic',
      },
    },
    { $unwind: '$topic' },
    {
      $project: {
        _id: '$topic._id',
        name: '$topic.name',
        questionCount: 1,
      },
    },
    { $sort: { name: 1 } },
    ]),
    Question.countDocuments({ subject, status: 'approved' }),
  ]);
  res.json({ topics, totalQuestionCount });
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
