const mongoose = require('mongoose');

const RoundSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    required: true,
    default: 1,
  },
  roundType: {
    type: String,
    enum: ['general', 'rapid_fire', 'buzzer', 'tie_breaker', 'custom'],
    default: 'general',
  },
  rules: {
    timeLimitPerQuestion: { type: Number, default: 15 },
    pointsPerQuestion: { type: Number, default: 10 },
    negativePoints: { type: Number, default: 5 },
    buzzerBonus: { type: Number, default: 5 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Round', RoundSchema);
