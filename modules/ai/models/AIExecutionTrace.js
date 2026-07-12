const mongoose = require('mongoose');

const StageSchema = new mongoose.Schema({
  stage: { type: String, required: true },
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['SUCCESS', 'SKIPPED', 'ERROR'], default: 'SUCCESS' },
  confidence: { type: Number },
  latency: { type: Number, required: true },
  reason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const AIExecutionTraceSchema = new mongoose.Schema({
  traceId: { type: String, required: true, unique: true },
  conversationId: { type: String },
  messageId: { type: String },
  sessionId: { type: String },
  userId: { type: String }, // Changed to String to allow "anonymous"
  
  rawInput: { type: String, required: true },
  normalizedInput: { type: String },
  finalOutput: { type: String },
  
  pipeline: [StageSchema],
  
  latency: { type: Number, default: 0 },
  geminiCalled: { type: Boolean, default: false },
  cacheHit: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  versionKey: false
});

AIExecutionTraceSchema.index({ sessionId: 1 });
AIExecutionTraceSchema.index({ userId: 1 });
AIExecutionTraceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AIExecutionTrace', AIExecutionTraceSchema);
