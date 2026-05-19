const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'alert', 'success'],
    default: 'info'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  targetModel: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'user', 'all'],
    default: 'admin'
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
