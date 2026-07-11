const mongoose = require('mongoose');

const ConversationsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Conversation' },
    status: { type: String, enum: ['Active', 'Closed', 'Handoff'], default: 'Active' },
    metadata: { type: mongoose.Schema.Types.Mixed },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    versionKey: '__v',
  }
);

ConversationsSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Conversations', ConversationsSchema);
