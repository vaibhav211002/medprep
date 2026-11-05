const express = require('express');
const fs = require('fs');
const requireAdmin = require('../middleware/auth');
const { uploadPyq } = require('../middleware/upload');
const { extractText, splitIntoQuestions } = require('../utils/pdfParser');
const { enrichQuestionsForReview } = require('../utils/grokClient');
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

    // Enrich questions with AI-selected topics, answer keys, and missing options.
    let enriched = extracted.map((question) => ({
      topicName: '',
      options: question.options || [],
      correctOptionKey: null,
    }));
    let enrichmentError = null;
    try {
      const existingTopics = await Topic.find({ subject: subject._id }).select('name');
      enriched = await enrichQuestionsForReview(
        subject.name,
        existingTopics.map((t) => t.name),
        extracted
      );
    } catch (err) {
      enrichmentError = err.code === 'NO_API_KEY'
        ? err.message
        : 'AI question enrichment failed: ' + err.message;
    }

    const created = [];
    for (let i = 0; i < extracted.length; i++) {
      const topicName = (enriched[i]?.topicName || '').trim();
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
        options: enriched[i]?.options || extracted[i].options || [],
        correctOptionKey: enriched[i]?.correctOptionKey || null,
        aiAnswer: enriched[i]?.explanation || '',
        topicToLearn: enriched[i]?.topicToLearn || '',
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
      enrichmentError,
      questions: created,
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload processing failed.', error: err.message });
  }
});

module.exports = router;
