const express = require('express');
const crypto = require('crypto');
const Question = require('../models/Question');
const { answerQuestion, enrichQuestionsForReview } = require('../utils/grokClient');

const router = express.Router();

const CACHE_LOCK_MS = 90_000;
const CACHE_WAIT_ATTEMPTS = 16;
const CACHE_WAIT_MS = 250;

async function getOrCreateCachedAnswer(question, generate) {
  if (question.aiAnswer) {
    return { answer: question.aiAnswer, topicToLearn: question.topicToLearn || '', cached: true };
  }

  const lockToken = crypto.randomUUID();
  const now = new Date();
  const lock = await Question.findOneAndUpdate(
    {
      _id: question._id,
      status: 'approved',
      $and: [
        { $or: [{ aiAnswer: '' }, { aiAnswer: null }, { aiAnswer: { $exists: false } }] },
        { $or: [{ aiAnswerLockAt: null }, { aiAnswerLockAt: { $exists: false } }, { aiAnswerLockAt: { $lt: new Date(now.getTime() - CACHE_LOCK_MS) } }] },
      ],
    },
    { $set: { aiAnswerLockToken: lockToken, aiAnswerLockAt: now } },
    { new: true }
  );

  if (!lock) {
    for (let attempt = 0; attempt < CACHE_WAIT_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, CACHE_WAIT_MS));
      const cached = await Question.findById(question._id).select('aiAnswer topicToLearn');
      if (cached?.aiAnswer) {
        return { answer: cached.aiAnswer, topicToLearn: cached.topicToLearn || '', cached: true };
      }
    }
    const err = new Error('An answer is being prepared for this question. Please retry shortly.');
    err.code = 'ANSWER_CACHE_BUSY';
    throw err;
  }

  try {
    const generated = await generate();
    const answer = String(generated.answer || '').trim();
    if (!answer) {
      throw new Error('The AI returned an empty explanation. Please retry.');
    }
    const saved = await Question.findOneAndUpdate(
      { _id: question._id, aiAnswerLockToken: lockToken },
      {
        $set: {
          aiAnswer: answer,
          topicToLearn: generated.topicToLearn || question.topic?.name || '',
          aiAnswerGeneratedAt: new Date(),
        },
        $unset: { aiAnswerLockToken: 1, aiAnswerLockAt: 1 },
      },
      { new: true }
    );
    if (!saved) {
      const fresh = await Question.findById(question._id).select('aiAnswer topicToLearn');
      if (fresh?.aiAnswer) {
        return { answer: fresh.aiAnswer, topicToLearn: fresh.topicToLearn || '', cached: true };
      }
      throw new Error('The question changed while its answer was being generated. Please retry.');
    }
    return { answer: saved.aiAnswer, topicToLearn: saved.topicToLearn || '', cached: false };
  } catch (err) {
    await Question.updateOne(
      { _id: question._id, aiAnswerLockToken: lockToken },
      { $unset: { aiAnswerLockToken: 1, aiAnswerLockAt: 1 } }
    );
    throw err;
  }
}

router.post('/:questionId', async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.questionId, status: 'approved' })
      .populate('subject', 'name')
      .populate('topic', 'name');

    if (!question) return res.status(404).json({ message: 'Question not found.' });

    const isMCQ = question.options && question.options.length >= 2;

    // --- MCQ path ---
    if (isMCQ) {
      if (!question.correctOptionKey || !question.options.some((option) => option.key === question.correctOptionKey)) {
        return res.status(409).json({ message: 'The answer key for this question has not been set yet. Please contact an admin.' });
      }
      const cached = await getOrCreateCachedAnswer(question, async () => {
        const [enriched] = await enrichQuestionsForReview(
          question.subject?.name || '',
          question.topic?.name ? [question.topic.name] : [],
          [{ questionText: question.questionText, options: question.options }]
        );
        return { answer: enriched?.explanation, topicToLearn: enriched?.topicToLearn };
      });
      return res.json({
        answer: cached.answer,
        correctKey: question.correctOptionKey,
        topicToLearn: cached.topicToLearn || question.topic?.name || '',
        cached: cached.cached,
      });
    }

    // --- Open answer path ---
    const cached = await getOrCreateCachedAnswer(question, async () => ({
      answer: await answerQuestion(
        question.subject?.name || '',
        question.topic?.name || '',
        question.questionText
      ),
    }));
    res.json({ answer: cached.answer, correctKey: null, cached: cached.cached });
  } catch (err) {
    console.error('ASK ERROR:', err.response?.data || err.message);
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ message: "AI answers aren't set up yet. Ask your admin to add an API key." });
    }
    if (err.code === 'ANSWER_CACHE_BUSY') {
      return res.status(503).json({ message: err.message, retryAfterSeconds: 3 });
    }
    res.status(502).json({
      message: 'Could not get an answer from the AI right now. Please try again.',
      error: err.message,
    });
  }
});

module.exports = router;
