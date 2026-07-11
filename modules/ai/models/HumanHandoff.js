const mongoose = require('mongoose');

const HumanHandoffSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
    status: { type: String, enum: ['Pending', 'Assigned', 'Resolved'], default: 'Pending' },
    assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },

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

HumanHandoffSchema.index({ status: 1 });
HumanHandoffSchema.index({ conversationId: 1 });

module.exports = mongoose.model('HumanHandoff', HumanHandoffSchema);
