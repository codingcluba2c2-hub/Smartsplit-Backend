/**
 * TraceStore
 * In-memory cache for fast developer mode querying. 
 * In production, this can be backed by Redis or MongoDB.
 */
class TraceStore {
  constructor() {
    this.traces = new Map(); // traceId -> TraceObject
  }

  saveTrace(traceId, traceData) {
    this.traces.set(traceId, traceData);
  }

  getTrace(traceId) {
    return this.traces.get(traceId);
  }

  getAllTraces() {
    return Array.from(this.traces.values()).sort((a, b) => b.startTime - a.startTime);
  }
}

module.exports = new TraceStore();