const express = require('express');
const router = express.Router();
const Round = require('../models/Round');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');

// Get all rounds for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const rounds = await Round.find({ eventId: req.params.eventId }).sort({ order: 1 });
    res.json({ success: true, data: rounds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create round
router.post('/', protect, async (req, res) => {
  try {
    const { eventId, title, description, order, roundType, rules } = req.body;
    const round = await Round.create({
      eventId,
      title,
      description,
      order: order || 1,
      roundType: roundType || 'general',
      rules: rules || {},
    });
    res.status(201).json({ success: true, data: round });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update round
router.put('/:id', protect, async (req, res) => {
  try {
    const round = await Round.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }
    res.json({ success: true, data: round });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete round (and associated questions)
router.delete('/:id', protect, async (req, res) => {
  try {
    const round = await Round.findByIdAndDelete(req.params.id);
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }
    await Question.deleteMany({ roundId: req.params.id });
    res.json({ success: true, message: 'Round and associated questions removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
