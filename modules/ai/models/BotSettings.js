const mongoose = require('mongoose');

const BotSettingsSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: false },
    name: { type: String, default: 'SmartSplit Assistant' },
    tone: { type: String, default: 'Professional' },
    language: { type: String, default: 'en' },
    fallbackMessage: { type: String },
    handoffMessage: { type: String },
    isActive: { type: Boolean, default: true },

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

BotSettingsSchema.index({ tenantId: 1 });

module.exports = mongoose.model('BotSettings', BotSettingsSchema);
