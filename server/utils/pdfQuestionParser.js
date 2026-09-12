const { PDFParse } = require('pdf-parse');

/**
 * Extracts text from a PDF Buffer using pdf-parse v2
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result && result.text ? result.text : '';
  } finally {
    if (typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (err) {
        // ignore destroy error
      }
    }
  }
}

/**
 * Parses raw text extracted from PDF or pasted by user into structured question objects
 * @param {string} rawText
 * @param {object} defaultOptions - default settings like points, category, timeLimit
 * @returns {Array<object>}
 */
function parseQuestionsFromText(rawText, defaultOptions = {}) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const questions = [];
  let currentQ = null;
  let currentOptionId = null;

  // Regex helpers
  // Matches "1.", "1)", "1:", "Q1.", "Q1:", "Q.1", "Question 1:", "Question 1."
  const questionStartRegex = /^\s*(?:Q(?:uestion)?\.?\s*)?(\d+)\s*[\.\:\)\-]\s*(.*)$/i;

  // Matches option starts: "A.", "A)", "(A)", "[A]", "a.", "a)", "(a)"
  const optionStartRegex = /^\s*(?:\(?([A-Da-d])\)|\(?([A-Da-d])[\.\:\]\)])\s*(.*)$/;

  // Inline multiple options regex: e.g. "(A) Apple (B) Banana (C) Cherry (D) Date" or "A) ... B) ..."
  const inlineOptionsRegex = /(?:^|\s+)(?:\(?([A-Da-d])[\)\.\]]\s*|\(([A-Da-d])\)\s*)([^\(\n\r]+?)(?=(?:\s+\(?[A-Da-d][\)\.\]]|\s*\([A-Da-d]\)|Answer|Ans|Key|$))/gi;

  // Answer key regex: "Answer: A", "Ans: (B)", "Correct: C", "Key: D"
  const answerRegex = /^\s*(?:Correct\s+Answer|Answer|Ans|Key|Correct\s+Option)\s*[\:\-\.]?\s*\(?([A-Da-d])\)?/i;

  // Explanation regex
  const explanationRegex = /^\s*(?:Explanation|Exp|Reason)\s*[\:\-\.]?\s*(.*)$/i;

  const finalizeCurrentQuestion = () => {
    if (!currentQ) return;

    // Clean up question text
    currentQ.questionText = currentQ.questionText.trim();
    if (!currentQ.questionText) return;

    // Normalize options
    const optionMap = { A: '', B: '', C: '', D: '' };
    currentQ.rawOptions.forEach((opt) => {
      const upperId = opt.id.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(upperId)) {
        optionMap[upperId] = (optionMap[upperId] ? optionMap[upperId] + ' ' : '') + opt.text.trim();
      }
    });

    const structuredOptions = ['A', 'B', 'C', 'D'].map((id) => ({
      id,
      text: optionMap[id] || '',
    }));

    // Check if at least 2 options have text
    const validOptionsCount = structuredOptions.filter((o) => o.text.trim().length > 0).length;
    if (validOptionsCount >= 2) {
      questions.push({
        questionText: currentQ.questionText,
        questionType: 'mcq',
        options: structuredOptions,
        correctAnswer: currentQ.correctAnswer ? currentQ.correctAnswer.toUpperCase() : 'A',
        explanation: currentQ.explanation.trim(),
        category: defaultOptions.category || 'General',
        difficulty: defaultOptions.difficulty || 'medium',
        points: defaultOptions.points || 10,
        negativePoints: defaultOptions.negativePoints || 5,
        timeLimit: defaultOptions.timeLimit || 15,
        buzzerEnabled: true,
        detectedAnswer: Boolean(currentQ.correctAnswer),
      });
    }

    currentQ = null;
    currentOptionId = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for Answer line
    const ansMatch = line.match(answerRegex);
    if (ansMatch && currentQ) {
      currentQ.correctAnswer = ansMatch[1].toUpperCase();
      currentOptionId = null;
      continue;
    }

    // Check for Explanation line
    const expMatch = line.match(explanationRegex);
    if (expMatch && currentQ) {
      currentQ.explanation = (currentQ.explanation ? currentQ.explanation + ' ' : '') + expMatch[1];
      currentOptionId = null;
      continue;
    }

    // Check if new Question starts
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      // Check if line also has options inside it or is just the question start
      finalizeCurrentQuestion();
      currentQ = {
        number: parseInt(qMatch[1], 10),
        questionText: qMatch[2],
        rawOptions: [],
        correctAnswer: null,
        explanation: '',
      };
      currentOptionId = null;
      continue;
    }

    if (!currentQ) continue;

    // Check for Option start on this line
    const optMatch = line.match(optionStartRegex);
    if (optMatch) {
      const optId = (optMatch[1] || optMatch[2]).toUpperCase();
      const optText = optMatch[3] || '';

      // Check if line contains inline multiple options (e.g. A) one B) two C) three D) four)
      const inlineMatches = [...line.matchAll(inlineOptionsRegex)];
      if (inlineMatches.length >= 2) {
        inlineMatches.forEach((m) => {
          const id = (m[1] || m[2]).toUpperCase();
          const text = (m[3] || '').trim();
          currentQ.rawOptions.push({ id, text });
        });
        currentOptionId = null;
        continue;
      }

      currentOptionId = optId;
      currentQ.rawOptions.push({ id: optId, text: optText });
      continue;
    }

    // Check if line contains inline multiple options even without leading match
    const inlineMatches = [...line.matchAll(inlineOptionsRegex)];
    if (inlineMatches.length >= 2) {
      inlineMatches.forEach((m) => {
        const id = (m[1] || m[2]).toUpperCase();
        const text = (m[3] || '').trim();
        currentQ.rawOptions.push({ id, text });
      });
      currentOptionId = null;
      continue;
    }

    // Otherwise continuation line:
    if (currentOptionId) {
      // Append text to the current option
      const lastOpt = currentQ.rawOptions.find((o) => o.id === currentOptionId);
      if (lastOpt) {
        lastOpt.text = (lastOpt.text ? lastOpt.text + ' ' : '') + line;
      }
    } else {
      // Append text to current question text
      currentQ.questionText = (currentQ.questionText ? currentQ.questionText + ' ' : '') + line;
    }
  }

  // Finalize last question in document
  finalizeCurrentQuestion();

  return questions;
}

module.exports = {
  extractTextFromPdf,
  parseQuestionsFromText,
};
