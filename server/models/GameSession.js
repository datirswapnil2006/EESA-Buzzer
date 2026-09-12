const mongoose = require('mongoose');

const GameSessionSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    unique: true,
  },
  state: {
    type: String,
    enum: [
      'WAITING',
      'STARTING',
      'QUESTION_ACTIVE',
      'BUZZER_ACTIVE',
      'BUZZER_LOCKED',
      'ANSWERING',
      'ANSWER_REVEAL',
      'QUESTION_RESULT',
      'ROUND_RESULT',
      'PAUSED',
      'COMPLETED',
    ],
    default: 'WAITING',
  },
  currentRoundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
  },
  currentQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  currentRoundIndex: {
    type: Number,
    default: 0,
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  questionStartTime: {
    type: Date,
  },
  questionDuration: {
    type: Number,
    default: 15,
  },
  buzzerStartTime: {
    type: Date,
  },
  buzzerLocked: {
    type: Boolean,
    default: false,
  },
  firstBuzzer: {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
    },
    participantName: { type: String, default: '' },
    teamName: { type: String, default: '' },
    selectedAnswer: { type: String, default: '' },
    selectedOptionText: { type: String, default: '' },
    isCorrect: { type: Boolean, default: null },
    responseTimeMs: { type: Number, default: 0 },
    timestamp: { type: Date },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('GameSession', GameSessionSchema);
