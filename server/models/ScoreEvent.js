const mongoose = require('mongoose');

const ScoreEventSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
  },
  action: {
    type: String,
    enum: [
      'CORRECT_ANSWER',
      'WRONG_ANSWER',
      'BUZZER_BONUS',
      'TIME_BONUS',
      'MANUAL_ADJUSTMENT',
      'RESET',
    ],
    required: true,
  },
  pointsDelta: {
    type: Number,
    required: true,
  },
  resultingScore: {
    type: Number,
    required: true,
  },
  note: {
    type: String,
    default: '',
  },
  selectedAnswer: {
    type: String,
    default: '',
  },
  selectedOptionText: {
    type: String,
    default: '',
  },
  correctAnswer: {
    type: String,
    default: '',
  },
  isCorrect: {
    type: Boolean,
    default: null,
  },
  responseTimeMs: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

ScoreEventSchema.index({ eventId: 1, participantId: 1 });

module.exports = mongoose.model('ScoreEvent', ScoreEventSchema);
