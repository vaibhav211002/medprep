const express = require('express');
const Question = require('../models/Question');
const { answerQuestion } = require('../utils/grokClient');

const router = express.Router();

router.post('/:questionId', async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.questionId, status: 'approved' }).populate(
      'subject',
      'name'
    ).populate('topic', 'name');

    if (!question) return res.status(404).json({ message: 'Question not found.' });

    if (question.aiAnswer) {
      return res.json({ answer: question.aiAnswer, cached: true });
    }

    const answer = await answerQuestion(
      question.subject?.name || '',
      question.topic?.name || '',
      question.questionText
    );

    question.aiAnswer = answer;
    question.aiAnswerGeneratedAt = new Date();
    await question.save();

    res.json({ answer, cached: false });
  } catch (err) {
    console.error('ASK ERROR:', err.response?.data || err.message);
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ message: "AI answers aren't set up yet. Ask your admin to add a Grok API key." });
    }
    res.status(502).json({ message: 'Could not get an answer from the AI right now. Please try again.', error: err.message });
  }
});

module.exports = router;
