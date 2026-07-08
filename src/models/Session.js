const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  userAgent: {
    type: String,
    default: 'unknown'
  },
  device: {
    type: String,
    default: 'unknown'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '1s' } // TTL index automatically removes expired sessions
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
