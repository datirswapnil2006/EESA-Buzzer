const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');

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
