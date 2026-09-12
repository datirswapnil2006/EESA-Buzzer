const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  eventCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  organizer: {
    type: String,
    default: 'Electronics Engineering Students Association (EESA)',
  },
  settings: {
    defaultPoints: { type: Number, default: 10 },
    defaultNegativePoints: { type: Number, default: 5 },
    buzzerBonus: { type: Number, default: 5 },
    defaultTimeLimit: { type: Number, default: 15 },
    negativeMarkingEnabled: { type: Boolean, default: true },
    allowDuplicateNames: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 200 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Event', EventSchema);
