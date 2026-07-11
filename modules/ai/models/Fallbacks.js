const mongoose = require('mongoose');

const FallbacksSchema = new mongoose.Schema(
  {
    triggerType: { type: String, enum: ['UnknownQuestion', 'NoMatch', 'NoKnowledge', 'HumanHandoff'], required: true },
    responses: [{ type: String, required: true }],
    language: { type: String, default: 'en' },
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

FallbacksSchema.index({ triggerType: 1 });

module.exports = mongoose.model('Fallbacks', FallbacksSchema);
