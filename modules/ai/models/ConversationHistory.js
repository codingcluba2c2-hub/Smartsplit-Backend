const mongoose = require('mongoose');

const ConversationHistorySchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    role: { type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true },
    content: { type: String, required: true },
    tokenCount: { type: Number, default: 0 },
    toolCalls: { type: mongoose.Schema.Types.Mixed },
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

ConversationHistorySchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('ConversationHistory', ConversationHistorySchema);
