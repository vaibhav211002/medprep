const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },

    questionText: { type: String, required: true },
    options: {
      type: [{ key: { type: String, lowercase: true, trim: true }, text: { type: String, trim: true } }],
      default: [],
    },
    correctOptionKey: { type: String, lowercase: true, trim: true, default: null },
    topicToLearn: { type: String, default: '' },

    // Raw topic name suggested by the AI before the admin confirms/edits it.
    suggestedTopicName: { type: String, default: '' },

    // pending_review: just extracted, waiting for admin to confirm topic + approve
    // approved: visible to students
    // rejected: bad OCR/parse, hidden everywhere but kept for audit
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected'],
      default: 'pending_review',
    },

    year: { type: String, default: '' },
    marks: { type: Number, default: null },

    sourceFileName: { type: String, default: '' },

    // Cached Grok answer so we don't re-call the API every time a student clicks.
    aiAnswer: { type: String, default: '' },
    aiAnswerGeneratedAt: { type: Date, default: null },
    aiAnswerLockToken: { type: String, default: null, select: false },
    aiAnswerLockAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

questionSchema.index({ subject: 1, topic: 1, status: 1 });

module.exports = mongoose.model('Question', questionSchema);
