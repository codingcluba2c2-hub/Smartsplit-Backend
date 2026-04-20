const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0.01
  },
  paymentType: {
    type: String,
    enum: ['UPI', 'CASH'],
    required: true
  },
  screenshot: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending'
  },
  settledAt: {
    type: Date
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settlement', settlementSchema);
