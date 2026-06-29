/**
 * Admin-only debug endpoint.
 * POST /api/debug/parse  (multipart, field: pdf)
 * Returns what the PDF parser extracted WITHOUT saving anything to the DB.
 * Use this to check why options aren't being detected for a specific PDF.
 */
const express = require('express');
const fs = require('fs');
const requireAdmin = require('../middleware/auth');
const { uploadPyq } = require('../middleware/upload');
const { extractText, debugParse } = require('../utils/pdfParser');

const router = express.Router();

router.post('/parse', requireAdmin, uploadPyq.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF required.' });
  try {
    const raw = await extractText(req.file.path);
    const questions = debugParse(raw);
    // Clean up temp file
    fs.unlink(req.file.path, () => {});
    res.json({
      totalExtracted: questions.length,
      mcqCount: questions.filter((q) => q.optionsFound > 0).length,
      openCount: questions.filter((q) => q.optionsFound === 0).length,
      questions,
      // First 500 chars of raw text so you can see what pdfParse actually read
      rawTextPreview: raw.slice(0, 500),
    });
  } catch (err) {
    fs.unlink(req.file?.path || '', () => {});
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
