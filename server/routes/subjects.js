const express = require('express');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

// Public: students need this for the subject dropdown
router.get('/', async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  res.json({ subjects });
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Subject name is required.' });
    const subject = await Subject.create({ name: name.trim(), description: description || '' });
    res.status(201).json({ subject });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A subject with this name already exists.' });
    }
    res.status(500).json({ message: 'Could not create subject.', error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const update = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Subject name is required.' });
      update.name = name.trim();
    }
    if (description !== undefined) update.description = description;

    const subject = await Subject.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    res.json({ subject });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A subject with this name already exists.' });
    }
    res.status(500).json({ message: 'Could not update subject.', error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  await Question.deleteMany({ subject: id });
  await Topic.deleteMany({ subject: id });
  await Subject.findByIdAndDelete(id);
  res.json({ message: 'Subject and its topics/questions removed.' });
});

module.exports = router;
