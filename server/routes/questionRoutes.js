const express = require('express');
const router = express.Router();
const multer = require('multer');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');
const { extractTextFromPdf, parseQuestionsFromText } = require('../utils/pdfQuestionParser');

// Configure multer in-memory storage for PDF uploads (15MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed'));
    }
  },
});

// Extract questions from uploaded PDF
router.post('/extract-pdf', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload a valid PDF file' });
    }

    const rawText = await extractTextFromPdf(req.file.buffer);
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from this PDF. It may be scanned or empty.',
      });
    }

    const defaultOptions = {
      category: req.body.category || 'General',
      difficulty: req.body.difficulty || 'medium',
      points: Number(req.body.points) || 10,
      negativePoints: Number(req.body.negativePoints) || 5,
      timeLimit: Number(req.body.timeLimit) || 15,
    };

    const questions = parseQuestionsFromText(rawText, defaultOptions);

    res.json({
      success: true,
      count: questions.length,
      filename: req.file.originalname,
      questions,
      rawTextSnippet: rawText.slice(0, 500),
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process PDF file' });
  }
});

// Extract questions from pasted plain text
router.post('/extract-text', protect, async (req, res) => {
  try {
    const { text, category, difficulty, points, negativePoints, timeLimit } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide valid text' });
    }

    const defaultOptions = {
      category: category || 'General',
      difficulty: difficulty || 'medium',
      points: Number(points) || 10,
      negativePoints: Number(negativePoints) || 5,
      timeLimit: Number(timeLimit) || 15,
    };

    const questions = parseQuestionsFromText(text, defaultOptions);

    res.json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get questions by event
router.get('/event/:eventId', async (req, res) => {
  try {
    const questions = await Question.find({ eventId: req.params.eventId }).sort({ order: 1 });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get questions by round
router.get('/round/:roundId', async (req, res) => {
  try {
    const questions = await Question.find({ roundId: req.params.roundId }).sort({ order: 1 });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Question bank search/filter
router.get('/bank', protect, async (req, res) => {
  try {
    const { category, difficulty, questionType, search } = req.query;
    const filter = {};

    if (category && category !== 'all') filter.category = category;
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
    if (questionType && questionType !== 'all') filter.questionType = questionType;
    if (search) {
      filter.questionText = { $regex: search, $options: 'i' };
    }

    const questions = await Question.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create question
router.post('/', protect, async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk import questions
router.post('/bulk', protect, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty questions array' });
    }
    const inserted = await Question.insertMany(questions);
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update question
router.put('/:id', protect, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete question
router.delete('/:id', protect, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, message: 'Question removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
