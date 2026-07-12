const mongoose = require('mongoose');

const SemanticCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true },
  normalizedQuestion: { type: String, required: true },
  questionEmbedding: { type: [Number], required: false },
  
  intent: { type: String },
  knowledgeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase' }],
  knowledgeChunkIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeChunks' }],
  retrievalScore: { type: Number },
  
  response: { type: String, required: true },
  responseEmbedding: { type: [Number] },
  
  language: { type: String, default: 'en' },
  provider: { type: String, default: 'gemini' },
  providerModel: { type: String },
  tokenUsage: { type: Number, default: 0 },
  
  hitCount: { type: Number, default: 0 },
  lastHitAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  optimisticConcurrency: true,
  versionKey: '__v'
});

// Indexes
SemanticCacheSchema.index({ intent: 1 });
SemanticCacheSchema.index({ hitCount: -1 });
SemanticCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Depending on Mongo version/setup, vector indexes might need Atlas Search definition rather than standard compound index, but standard index on the array helps slightly if basic queries are used.
// SemanticCacheSchema.index({ questionEmbedding: 1 }); 

module.exports = mongoose.models.SemanticCache || mongoose.model('SemanticCache', SemanticCacheSchema);
