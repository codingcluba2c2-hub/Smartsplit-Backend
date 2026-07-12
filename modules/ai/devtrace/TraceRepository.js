const AIExecutionTrace = require('../models/AIExecutionTrace');

class TraceRepository {
  async saveTrace(traceData) {
    const trace = new AIExecutionTrace(traceData);
    return await trace.save();
  }

  async getRecentTraces(limit = 20) {
    return AIExecutionTrace.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  async getTraceById(traceId) {
    return AIExecutionTrace.findOne({ traceId }).lean();
  }
}

module.exports = new TraceRepository();
