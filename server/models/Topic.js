const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  },
  { timestamps: true }
);

// A topic name only needs to be unique within its own subject.
topicSchema.index({ name: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Topic', topicSchema);
