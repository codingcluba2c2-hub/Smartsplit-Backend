const mongoose = require('mongoose');

const BotSessionsSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, unique: true },
    contextData: { type: mongoose.Schema.Types.Mixed },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

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

BotSessionsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BotSessions', BotSessionsSchema);
