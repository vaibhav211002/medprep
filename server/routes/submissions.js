const express = require('express');
const path = require('path');
const fs = require('fs');
const requireAdmin = require('../middleware/auth');
const { uploadSubmission } = require('../middleware/upload');
const Submission = require('../models/Submission');
const Subject = require('../models/Subject');
const { notifyAdminOfSubmission } = require('../utils/mailer');

const router = express.Router();

// Public: a student submitting a question paper PDF.
router.post('/', uploadSubmission.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A PDF file is required.' });

  const { studentName, studentEmail, subjectId, note } = req.body;
  if (!studentEmail) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'Your email address is required.' });
  }

  try {
    const submission = await Submission.create({
      studentName: studentName || '',
      studentEmail,
      subject: subjectId || null,
      note: note || '',
      fileName: req.file.originalname,
      filePath: req.file.path,
    });

    let emailSent = false;
    try {
      const subject = subjectId ? await Subject.findById(subjectId) : null;
      emailSent = await notifyAdminOfSubmission({
        studentName,
        studentEmail,
        subjectName: subject?.name,
        note,
        attachmentPath: req.file.path,
        fileName: req.file.originalname,
      });
      if (emailSent) {
        submission.emailSent = true;
        await submission.save();
      }
    } catch (mailErr) {
      // Submission is already saved either way -- email is best-effort.
      console.error('[mailer] failed to notify admin:', mailErr.message);
    }

    res.status(201).json({
      message: 'Thanks! Your question paper was submitted successfully.',
      emailSent,
    });
  } catch (err) {
    res.status(500).json({ message: 'Submission failed.', error: err.message });
  }
});

// Admin: inbox of submissions.
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const submissions = await Submission.find(filter).populate('subject', 'name').sort({ createdAt: -1 });
  res.json({ submissions });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const submission = await Submission.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!submission) return res.status(404).json({ message: 'Submission not found.' });
  res.json({ submission });
});

// Admin: download the original PDF.
router.get('/:id/file', requireAdmin, async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission || !fs.existsSync(submission.filePath)) {
    return res.status(404).json({ message: 'File not found.' });
  }
  res.download(path.resolve(submission.filePath), submission.fileName);
});

module.exports = router;
