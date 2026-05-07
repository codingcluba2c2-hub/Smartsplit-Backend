const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  email: String,
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    browser: String,
    os: String,
    device: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LoginLog', loginLogSchema);
