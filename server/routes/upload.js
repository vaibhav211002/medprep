const express = require('express');
const fs = require('fs');
const requireAdmin = require('../middleware/auth');
const { uploadPyq } = require('../middleware/upload');
const { extractText, splitIntoQuestions } = require('../utils/pdfParser');
const { classifyQuestionsByTopic } = require('../utils/grokClient');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Question = require('../models/Question');

const router = express.Router();

router.post('/', requireAdmin, uploadPyq.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A PDF file is required.' });

  const { subjectId, year } = req.body;
  if (!subjectId) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'subjectId is required.' });
  }

  try {
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const text = await extractText(req.file.path);
    const extracted = splitIntoQuestions(text);

    if (extracted.length === 0) {
      return res.status(422).json({
        message:
          'No numbered questions could be detected in this PDF. It may be a scanned/' +
          'image-only PDF (which needs OCR, not supported yet) or use an unusual numbering style.',
      });
    }

    // Try to auto-suggest a topic per question. If Grok isn't configured or
    // the call fails, we still save the questions for manual tagging.
    let suggestedTopics = extracted.map(() => '');
    let classificationError = null;
    try {
      const existingTopics = await Topic.find({ subject: subject._id }).select('name');
      suggestedTopics = await classifyQuestionsByTopic(
        subject.name,
        existingTopics.map((t) => t.name),
        extracted
      );
    } catch (err) {
      classificationError = err.code === 'NO_API_KEY' ? err.message : 'AI topic suggestion failed: ' + err.message;
    }

    const created = [];
    for (let i = 0; i < extracted.length; i++) {
      const topicName = (suggestedTopics[i] || '').trim();
      let topicDoc = null;

      if (topicName) {
        topicDoc = await Topic.findOneAndUpdate(
          { subject: subject._id, name: new RegExp(`^${topicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { $setOnInsert: { name: topicName, subject: subject._id } },
          { upsert: true, new: true }
        );
      }

      const question = await Question.create({
        subject: subject._id,
        topic: topicDoc ? topicDoc._id : null,
        questionText: extracted[i].questionText,
        suggestedTopicName: topicName,
        marks: extracted[i].marks,
        year: year || '',
        sourceFileName: req.file.originalname,
        status: 'pending_review',
      });
      created.push(question);
    }

    res.status(201).json({
      message: `Extracted ${created.length} question(s). Review and approve them before they go live.`,
      classificationError,
      questions: created,
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload processing failed.', error: err.message });
  }
});

module.exports = router;
