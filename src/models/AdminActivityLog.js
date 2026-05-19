const mongoose = require('mongoose');

const adminActivityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true // e.g. 'EDIT_USER', 'BLOCK_USER', 'DELETE_GROUP'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Group', 'Expense', 'Settlement', 'Report']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminActivityLog', adminActivityLogSchema);
