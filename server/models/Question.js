const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
  },
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  questionType: {
    type: String,
    enum: ['mcq', 'true_false', 'buzzer', 'rapid_fire', 'image', 'tie_breaker'],
    default: 'mcq',
  },
  options: [OptionSchema],
  correctAnswer: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  points: {
    type: Number,
    default: 10,
  },
  negativePoints: {
    type: Number,
    default: 5,
  },
  timeLimit: {
    type: Number,
    default: 15,
  },
  buzzerEnabled: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Question', QuestionSchema);
