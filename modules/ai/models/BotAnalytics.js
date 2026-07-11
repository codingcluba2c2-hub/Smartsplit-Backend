const mongoose = require('mongoose');

const BotAnalyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    handoffCount: { type: Number, default: 0 },
    resolutionRate: { type: Number, default: 0 },

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

BotAnalyticsSchema.index({ date: 1 });

module.exports = mongoose.model('BotAnalytics', BotAnalyticsSchema);
