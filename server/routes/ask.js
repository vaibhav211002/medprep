const express = require('express');
const Question = require('../models/Question');
const { answerQuestion, determineCorrectOption } = require('../utils/grokClient');

const router = express.Router();

router.post('/:questionId', async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.questionId, status: 'approved' })
      .populate('subject', 'name')
      .populate('topic', 'name');

    if (!question) return res.status(404).json({ message: 'Question not found.' });

    const isMCQ = question.options && question.options.length >= 2;

    // --- MCQ path ---
    if (isMCQ) {
      // Return cached result if we have it
      if (question.correctOptionKey && question.aiAnswer) {
        return res.json({
          answer: question.aiAnswer,
          correctKey: question.correctOptionKey,
          cached: true,
        });
      }

      // Ask AI for correct option + explanation
      const { correctKey, explanation } = await determineCorrectOption(
        question.subject?.name || '',
        question.topic?.name || '',
        question.questionText,
        question.options
      );

      question.correctOptionKey = correctKey;
      question.aiAnswer = explanation;
      question.aiAnswerGeneratedAt = new Date();
      await question.save();

      return res.json({ answer: explanation, correctKey, cached: false });
    }

    // --- Open answer path ---
    if (question.aiAnswer) {
      return res.json({ answer: question.aiAnswer, correctKey: null, cached: true });
    }

    const answer = await answerQuestion(
      question.subject?.name || '',
      question.topic?.name || '',
      question.questionText
    );

    question.aiAnswer = answer;
    question.aiAnswerGeneratedAt = new Date();
    await question.save();

    res.json({ answer, correctKey: null, cached: false });
  } catch (err) {
    console.error('ASK ERROR:', err.response?.data || err.message);
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ message: "AI answers aren't set up yet. Ask your admin to add an API key." });
    }
    res.status(502).json({
      message: 'Could not get an answer from the AI right now. Please try again.',
      error: err.message,
    });
  }
});

module.exports = router;
