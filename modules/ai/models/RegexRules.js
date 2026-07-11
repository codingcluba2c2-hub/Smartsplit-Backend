const mongoose = require('mongoose');

const RegexRulesSchema = new mongoose.Schema(
  {
    intentName: { type: String, required: true },
    pattern: { type: String, required: true },
    flags: { type: String, default: 'i' },
    description: { type: String },
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

RegexRulesSchema.index({ intentName: 1 });

module.exports = mongoose.model('RegexRules', RegexRulesSchema);
