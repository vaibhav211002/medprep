const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extract raw text from a PDF file on disk.
 * NOTE: this only works for text-based PDFs (typed question papers exported
 * to PDF, or PDFs with a text layer). Scanned/photographed papers will
 * return little or no usable text -- that would need an OCR step (e.g.
 * tesseract.js) which isn't wired up here yet.
 */
async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

// Matches a line that starts a new question, e.g:
//   "1. Describe the..."   "Q1) Explain.."   "Question 12: Define.."   "Q.5 What is.."
const QUESTION_START = /^\s*(?:Q(?:uestion|ue)?\.?\s*)?(\d{1,3})\s*[.):]\s+(?=\S)/gm;

// Pulls a trailing marks hint out of a question, e.g. "[5 Marks]" "(10 marks)" "[5]"
const MARKS_PATTERN = /[\[(]\s*(\d{1,3})\s*(?:marks?|m)?\s*[\])]\s*$/i;

/**
 * Heuristically split raw PDF text into individual question strings.
 * This is pattern-based (numbered questions), not a perfect parser --
 * odd PDFs (multi-column layouts, unusual numbering, scanned images)
 * may split incorrectly. That's exactly why extracted questions land in
 * "pending review" rather than going straight to students.
 */
function splitIntoQuestions(rawText) {
  const text = rawText.replace(/\r/g, '').replace(/\u00a0/g, ' ');

  const matches = [...text.matchAll(QUESTION_START)];
  if (matches.length === 0) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
  }

  return chunks
    .map((chunk) => {
      const cleaned = chunk
        .replace(/\n{2,}/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      let marks = null;
      const marksMatch = cleaned.match(MARKS_PATTERN);
      if (marksMatch) marks = Number(marksMatch[1]);

      return { questionText: cleaned, marks };
    })
    .filter((q) => q.questionText.length >= 8); // drop near-empty/junk fragments
}

module.exports = { extractText, splitIntoQuestions };
