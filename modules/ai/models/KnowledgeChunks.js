const mongoose = require('mongoose');

const KnowledgeChunksSchema = new mongoose.Schema(
  {
    knowledgeBaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase', required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: false },
    tokenCount: { type: Number },
    metadata: { type: mongoose.Schema.Types.Mixed },

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

KnowledgeChunksSchema.index({ knowledgeBaseId: 1, chunkIndex: 1 });
// KnowledgeChunksSchema.index({ embedding: '2dsphere' }); // specific to Vector setup

module.exports = mongoose.model('KnowledgeChunks', KnowledgeChunksSchema);
