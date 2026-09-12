const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const ScoreEvent = require('../models/ScoreEvent');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');

// Get all participants for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const participants = await Participant.find({ eventId: req.params.eventId }).sort({ score: -1, name: 1 });
    res.json({ success: true, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Join event (Student registration)
router.post('/join', async (req, res) => {
  try {
    const { eventCode, name, teamName, department, participantId } = req.body;

    if (!eventCode || !name || !teamName || !department) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const event = await Event.findOne({ eventCode: eventCode.trim().toUpperCase() });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found with this code' });
    }

    if (event.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This event has already ended' });
    }

    // Check duplicate name/team if not allowed
    if (!event.settings?.allowDuplicateNames) {
      const existing = await Participant.findOne({
        eventId: event._id,
        $or: [
          { name: { $regex: `^${name.trim()}$`, $options: 'i' } },
          { teamName: { $regex: `^${teamName.trim()}$`, $options: 'i' } }
        ],
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A participant or team with this name has already joined this event',
        });
      }
    }

    const participant = await Participant.create({
      eventId: event._id,
      name: name.trim(),
      teamName: teamName.trim(),
      department: department.trim(),
      participantId: (participantId || '').trim(),
      isConnected: true,
    });

    res.status(201).json({
      success: true,
      data: {
        participant,
        event: {
          _id: event._id,
          title: event.title,
          eventCode: event.eventCode,
          status: event.status,
          organizer: event.organizer,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update participant score manually (Host action)
router.put('/:id/score', protect, async (req, res) => {
  try {
    const { delta, note } = req.body;
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    participant.score += Number(delta);
    await participant.save();

    await ScoreEvent.create({
      eventId: participant.eventId,
      participantId: participant._id,
      action: 'MANUAL_ADJUSTMENT',
      pointsDelta: Number(delta),
      resultingScore: participant.score,
      note: note || 'Host manual score adjustment',
    });

    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove participant (Host action)
router.delete('/:id', protect, async (req, res) => {
  try {
    const participant = await Participant.findByIdAndDelete(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }
    res.json({ success: true, message: 'Participant removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
