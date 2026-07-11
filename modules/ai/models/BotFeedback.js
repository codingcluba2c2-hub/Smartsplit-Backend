const mongoose = require('mongoose');

const BotFeedbackSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConversationHistory', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, enum: [1, -1], required: true },
    comments: { type: String },

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

BotFeedbackSchema.index({ conversationId: 1 });
BotFeedbackSchema.index({ userId: 1 });

module.exports = mongoose.model('BotFeedback', BotFeedbackSchema);
