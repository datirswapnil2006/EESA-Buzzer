const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  teamName: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  participantId: {
    type: String,
    trim: true,
    default: '',
  },
  socketId: {
    type: String,
    default: '',
  },
  isConnected: {
    type: Boolean,
    default: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  correctCount: {
    type: Number,
    default: 0,
  },
  wrongCount: {
    type: Number,
    default: 0,
  },
  buzzerWins: {
    type: Number,
    default: 0,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

ParticipantSchema.index({ eventId: 1, teamName: 1 });
ParticipantSchema.index({ eventId: 1, score: -1 });

module.exports = mongoose.model('Participant', ParticipantSchema);
