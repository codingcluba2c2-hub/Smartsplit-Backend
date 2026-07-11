const mongoose = require('mongoose');

const IntentRulesSchema = new mongoose.Schema(
  {
    intentName: { type: String, required: true, unique: true },
    description: { type: String },
    examples: [{ type: String }],
    actionType: { type: String, enum: ['Greeting', 'FAQ', 'Knowledge', 'DatabaseQuery', 'Fallback', 'HumanHandoff'], required: true },
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

IntentRulesSchema.index({ intentName: 1 });

module.exports = mongoose.model('IntentRules', IntentRulesSchema);
