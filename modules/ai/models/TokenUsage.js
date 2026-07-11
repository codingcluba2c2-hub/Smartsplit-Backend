const mongoose = require('mongoose');

const TokenUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    month: { type: String, required: true }, // e.g., '2023-10'
    totalTokens: { type: Number, default: 0 },
    limitTokens: { type: Number, default: 100000 },

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

TokenUsageSchema.index({ userId: 1, month: 1 });
TokenUsageSchema.index({ groupId: 1, month: 1 });

module.exports = mongoose.model('TokenUsage', TokenUsageSchema);
