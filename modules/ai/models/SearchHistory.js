const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema(
  {
    query: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resultsFound: { type: Number, default: 0 },
    responseTimeMs: { type: Number },
    intentDetected: { type: String },

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

SearchHistorySchema.index({ createdAt: 1 });
SearchHistorySchema.index({ userId: 1 });

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
