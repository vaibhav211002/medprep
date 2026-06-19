const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    studentName: { type: String, default: '' },
    studentEmail: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    note: { type: String, default: '' },

    fileName: { type: String, required: true },
    filePath: { type: String, required: true },

    status: { type: String, enum: ['new', 'reviewed'], default: 'new' },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);
