const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: false // Optional for media messages
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'voice'],
    default: 'text'
  },
  mediaUrl: String,
  mediaPublicId: String,
  fileName: String,
  fileSize: Number,
  duration: Number, // for voice messages
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', chatSchema);
