const mongoose = require('mongoose');

const AIUsageSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true },
    provider: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    requestId: { type: String },

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

AIUsageSchema.index({ createdAt: 1 });
AIUsageSchema.index({ provider: 1, modelName: 1 });

module.exports = mongoose.model('AIUsage', AIUsageSchema);
