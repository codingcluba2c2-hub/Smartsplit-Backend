const mongoose = require('mongoose');

const EmbeddingCacheSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
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

EmbeddingCacheSchema.index({ hash: 1 });
EmbeddingCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmbeddingCache', EmbeddingCacheSchema);
