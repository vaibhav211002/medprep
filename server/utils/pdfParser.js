const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

// Matches numbered question starts:
// "1. "  "Q1) "  "Question 12: "  "Q.5 "  "1) "
const QUESTION_START = /^\s*(?:Q(?:uestion|ue)?\.?\s*)?(\d{1,3})\s*[.):]\s+(?=\S)/gm;

// Trailing marks hint: "[5 Marks]" "(10 marks)" "[5]"
const MARKS_PATTERN = /[\[(]\s*(\d{1,3})\s*(?:marks?|m)?\s*[\])]\s*$/i;

/**
 * Matches an MCQ option line. Handles all common medical exam PDF formats:
 *   a) text       (a) text      a. text      a: text      a- text
 *   A) text       (A) text      A. text      A: text      A- text
 *   (a) text      [a] text
 * Also handles options inline like "a) Rota  b) OPV  c) Penta  d) dT"
 */
const OPTION_LINE_RE = /^\s*[\[(]?\s*([a-dA-D])\s*[\])]?[\s]*[.):\-]\s*(.+)/;

/**
 * Some PDFs put all options on a single line, e.g:
 * "a) Rota   b) OPV   c) Pentavalent   d) dT"
 * This regex finds all option key+text pairs on one line.
 */
const INLINE_OPTIONS_RE = /[\[(]?\s*([a-dA-D])\s*[\])]?\s*[.):\-]\s*([^a-dA-D)(\][\n]+?)(?=\s*[\[(]?\s*[a-dA-D]\s*[\])]?\s*[.):\-]|$)/gi;

/**
 * Try to extract inline options from a single line like:
 * "a) Rota  b) OPV  c) Pentavalent  d) dT"
 */
function tryInlineOptions(line) {
  const matches = [...line.matchAll(INLINE_OPTIONS_RE)];
  if (matches.length < 2) return null;
  return matches.map((m) => ({ key: m[1].toLowerCase(), text: m[2].trim() }));
}

/**
 * Split a question block into stem + MCQ options.
 * Handles: one-option-per-line, all-options-on-one-line, mixed.
 */
function extractOptions(blockText) {
  const lines = blockText.split('\n').map((l) => l.trim()).filter(Boolean);
  const stemLines = [];
  const options = [];
  let inOptions = false;

  for (const line of lines) {
    // Check if this entire line is multiple options jammed together
    const inlineOpts = tryInlineOptions(line);
    if (inlineOpts && inlineOpts.length >= 2) {
      inOptions = true;
      for (const o of inlineOpts) {
        if (!options.find((ex) => ex.key === o.key)) {
          options.push(o);
        }
      }
      continue;
    }

    // Check for single option on its own line
    const m = line.match(OPTION_LINE_RE);
    if (m) {
      const key = m[1].toLowerCase();
      const text = m[2].trim();
      // Only treat as option if it starts with a/b/c/d in order or close
      if (!options.find((ex) => ex.key === key)) {
        inOptions = true;
        options.push({ key, text });
      }
      continue;
    }

    if (!inOptions) {
      stemLines.push(line);
    } else if (options.length > 0) {
      // Continuation of previous option's text (wrapped line)
      options[options.length - 1].text += ' ' + line;
    }
  }

  // Must have at least 2 unique option keys to count as MCQ
  const distinctKeys = new Set(options.map((o) => o.key));
  if (options.length < 2 || distinctKeys.size < 2) {
    return { questionText: blockText.trim(), options: [] };
  }

  // Sort options alphabetically (a, b, c, d)
  options.sort((x, y) => x.key.localeCompare(y.key));

  const questionText = stemLines.join(' ').trim() || blockText.trim();
  return { questionText, options };
}

function splitIntoQuestions(rawText) {
  // Normalise whitespace & special chars from PDF extraction
  const text = rawText
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, ' ');

  const matches = [...text.matchAll(QUESTION_START)];
  if (matches.length === 0) return [];

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
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      let marks = null;
      const marksMatch = cleaned.match(MARKS_PATTERN);
      if (marksMatch) marks = Number(marksMatch[1]);

      const { questionText, options } = extractOptions(cleaned);
      return { questionText, options, marks };
    })
    .filter((q) => q.questionText.length >= 8);
}

/**
 * Debug helper: call this from a test route to see what was parsed
 * from a PDF without saving anything to the database.
 */
function debugParse(rawText) {
  const questions = splitIntoQuestions(rawText);
  return questions.map((q, i) => ({
    index: i + 1,
    questionText: q.questionText,
    optionsFound: q.options.length,
    options: q.options,
    marks: q.marks,
  }));
}

module.exports = { extractText, splitIntoQuestions, extractOptions, debugParse };
