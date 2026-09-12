const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Round = require('../models/Round');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const GameSession = require('../models/GameSession');
const ScoreEvent = require('../models/ScoreEvent');
const { protect } = require('../middleware/auth');
const { Parser } = require('json2csv');

// List events
router.get('/', protect, async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get event by eventCode (Public for join and display)
router.get('/code/:eventCode', async (req, res) => {
  try {
    const event = await Event.findOne({ eventCode: req.params.eventCode.toUpperCase() });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const rounds = await Round.find({ eventId: event._id }).sort({ order: 1 });
    const session = await GameSession.findOne({ eventId: event._id });

    res.json({
      success: true,
      data: {
        event,
        rounds,
        sessionState: session?.state || 'WAITING',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get event by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const rounds = await Round.find({ eventId: event._id }).sort({ order: 1 });
    const questions = await Question.find({ eventId: event._id }).sort({ order: 1 });
    const participants = await Participant.find({ eventId: event._id }).sort({ score: -1 });
    const session = await GameSession.findOne({ eventId: event._id });

    res.json({
      success: true,
      data: {
        event,
        rounds,
        questions,
        participants,
        session,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7-Step Wizard Event Creation
router.post('/wizard', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      eventCode,
      organizer,
      date,
      settings,
      rounds,
      questions,
    } = req.body;

    // Check unique eventCode
    const code = (eventCode || 'EESA' + Math.floor(1000 + Math.random() * 9000)).toUpperCase().trim();
    const existing = await Event.findOne({ eventCode: code });
    if (existing) {
      return res.status(400).json({ success: false, message: `Event code ${code} is already taken. Please choose another.` });
    }

    // 1. Create Event
    const event = await Event.create({
      title,
      description,
      eventCode: code,
      organizer: organizer || 'Electronics Engineering Students Association (EESA)',
      date: date || Date.now(),
      createdBy: req.user._id,
      settings: settings || {},
      status: 'draft',
    });

    // 2. Create Rounds & map
    const createdRounds = [];
    const roundMap = {}; // index or tempId -> roundId

    if (Array.isArray(rounds) && rounds.length > 0) {
      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i];
        const roundDoc = await Round.create({
          eventId: event._id,
          title: r.title || `Round ${i + 1}`,
          description: r.description || '',
          order: i + 1,
          roundType: r.roundType || 'general',
          rules: r.rules || {},
        });
        createdRounds.push(roundDoc);
        if (r.tempId) roundMap[r.tempId] = roundDoc._id;
        roundMap[i] = roundDoc._id;
      }
    } else {
      // Default round 1 if none provided
      const defaultRound = await Round.create({
        eventId: event._id,
        title: 'Round 1: General Challenge',
        order: 1,
        roundType: 'general',
      });
      createdRounds.push(defaultRound);
      roundMap[0] = defaultRound._id;
    }

    // 3. Create Questions
    const createdQuestions = [];
    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let targetRoundId = createdRounds[0]._id;
        if (q.roundIndex !== undefined && roundMap[q.roundIndex]) {
          targetRoundId = roundMap[q.roundIndex];
        } else if (q.tempRoundId && roundMap[q.tempRoundId]) {
          targetRoundId = roundMap[q.tempRoundId];
        }

        const qDoc = await Question.create({
          eventId: event._id,
          roundId: targetRoundId,
          questionText: q.questionText,
          questionType: q.questionType || 'mcq',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          imageUrl: q.imageUrl || '',
          category: q.category || 'General',
          difficulty: q.difficulty || 'medium',
          points: q.points || event.settings?.defaultPoints || 10,
          negativePoints: q.negativePoints || event.settings?.defaultNegativePoints || 5,
          timeLimit: q.timeLimit || event.settings?.defaultTimeLimit || 15,
          buzzerEnabled: q.buzzerEnabled !== false,
          order: i + 1,
        });
        createdQuestions.push(qDoc);
      }
    }

    // 4. Initialize GameSession in WAITING state
    const session = await GameSession.create({
      eventId: event._id,
      state: 'WAITING',
      currentRoundId: createdRounds[0]._id,
      currentQuestionId: createdQuestions[0]?._id,
      currentRoundIndex: 0,
      currentQuestionIndex: 0,
    });

    res.status(201).json({
      success: true,
      data: {
        event,
        rounds: createdRounds,
        questionsCount: createdQuestions.length,
        session,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update event
router.put('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete event and all related data
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    await Round.deleteMany({ eventId: req.params.id });
    await Question.deleteMany({ eventId: req.params.id });
    await Participant.deleteMany({ eventId: req.params.id });
    await GameSession.deleteMany({ eventId: req.params.id });
    await ScoreEvent.deleteMany({ eventId: req.params.id });

    res.json({ success: true, message: 'Event and all related records deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Event Results & Final Standings
router.get('/:id/results', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const participants = await Participant.find({ eventId: event._id }).sort({ score: -1, buzzerWins: -1 });
    const scoreEvents = await ScoreEvent.find({ eventId: event._id })
      .populate('participantId', 'name teamName department participantId')
      .populate('questionId', 'questionText options correctAnswer points negativePoints order')
      .populate('roundId', 'title order')
      .sort({ timestamp: -1 });

    const totalQuestions = await Question.countDocuments({ eventId: event._id });
    const totalRounds = await Round.countDocuments({ eventId: event._id });

    res.json({
      success: true,
      data: {
        event,
        leaderboard: participants,
        totalQuestions,
        totalRounds,
        totalParticipants: participants.length,
        scoreEvents,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export CSV (supports ?type=buzzers or default standings)
router.get('/:id/export', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const { type } = req.query;

    if (type === 'buzzers') {
      const scoreEvents = await ScoreEvent.find({ eventId: event._id })
        .populate('participantId', 'name teamName department participantId')
        .populate('questionId', 'questionText correctAnswer points negativePoints order')
        .populate('roundId', 'title order')
        .sort({ timestamp: 1 });

      const fields = [
        { label: 'Timestamp', value: (row) => new Date(row.timestamp).toLocaleString() },
        { label: 'Round', value: (row) => row.roundId?.title || '' },
        { label: 'Question #', value: (row) => row.questionId?.order || '' },
        { label: 'Question Text', value: (row) => row.questionId?.questionText || '' },
        { label: 'Team Name', value: (row) => row.participantId?.teamName || '' },
        { label: 'Participant Name', value: (row) => row.participantId?.name || '' },
        { label: 'Selected Option', value: 'selectedAnswer' },
        { label: 'Selected Option Text', value: 'selectedOptionText' },
        { label: 'Correct Answer', value: 'correctAnswer' },
        { label: 'Verdict', value: (row) => row.isCorrect === true ? 'CORRECT' : row.isCorrect === false ? 'WRONG' : row.action },
        { label: 'Points Delta', value: 'pointsDelta' },
        { label: 'Resulting Score', value: 'resultingScore' },
        { label: 'Response Time (ms)', value: 'responseTimeMs' },
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(scoreEvents);

      res.header('Content-Type', 'text/csv');
      res.attachment(`${event.eventCode || 'eesa'}_buzzer_results.csv`);
      return res.send(csv);
    }

    const participants = await Participant.find({ eventId: event._id }).sort({ score: -1, buzzerWins: -1 });

    const fields = [
      { label: 'Rank', value: (row, idx) => idx + 1 },
      { label: 'Team Name', value: 'teamName' },
      { label: 'Student Name', value: 'name' },
      { label: 'Department', value: 'department' },
      { label: 'Participant ID', value: 'participantId' },
      { label: 'Final Score', value: 'score' },
      { label: 'Correct Answers', value: 'correctCount' },
      { label: 'Wrong Answers', value: 'wrongCount' },
      { label: 'Buzzer Wins', value: 'buzzerWins' },
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(participants);

    res.header('Content-Type', 'text/csv');
    res.attachment(`${event.eventCode || 'eesa'}_standings.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
