const TraceRepository = require('./TraceRepository');
const { v4: uuidv4 } = require('uuid');

class TraceService {
  constructor() {
    // In a real high-throughput Node.js app, this should use AsyncLocalStorage
    // For simplicity, we create and return a TraceContext object per request
  }

  createContext(userId, sessionId, rawInput) {
    const context = {
      traceId: uuidv4(),
      userId,
      sessionId,
      rawInput,
      normalizedInput: null,
      finalOutput: null,
      pipeline: [],
      startTime: Date.now(),
      geminiCalled: false,
      cacheHit: false,
      
      startStage(stageName) {
        return { stageName, startTime: Date.now() };
      },
      
      endStage(stageTracker, status, output, confidence, reason, metadata = {}) {
        const latency = Date.now() - stageTracker.startTime;
        const stagePayload = {
          stage: stageTracker.stageName,
          input: metadata.input || null,
          output,
          status,
          confidence,
          latency,
          reason,
          metadata
        };
        this.pipeline.push(stagePayload);
        
        console.log(`[TRACE] Step: ${stageTracker.stageName} (${status}) - Latency: ${latency}ms`);
        
        try {
          const { emitToTraceRoom } = require('../../../src/services/socketService');
          const delivered = emitToTraceRoom('trace:stage', { traceId: this.traceId, stage: stagePayload });
          console.log(`[TRACE] Delivered to ${delivered} clients: trace:stage [${stageTracker.stageName}]`);
        } catch (e) { 
          console.error(`[TRACE-ERROR] Failed to emit trace:stage for ${stageTracker.stageName}:`, e.message);
        }
      },

      recordSkip(stageName, reason) {
        const stagePayload = {
          stage: stageName,
          status: 'SKIPPED',
          latency: 0,
          reason
        };
        this.pipeline.push(stagePayload);
        
        console.log(`[TRACE] Step: ${stageName} (SKIPPED) - Reason: ${reason}`);
        
        try {
          const { emitToTraceRoom } = require('../../../src/services/socketService');
          const delivered = emitToTraceRoom('trace:stage', { traceId: this.traceId, stage: stagePayload });
          console.log(`[TRACE] Delivered to ${delivered} clients: trace:stage [${stageName} - SKIPPED]`);
        } catch (e) { 
          console.error(`[TRACE-ERROR] Failed to emit trace:stage (SKIP) for ${stageName}:`, e.message);
        }
      },

      async commit(finalOutput) {
        this.finalOutput = finalOutput;
        const totalLatency = Date.now() - this.startTime;
        
        try {
          await TraceRepository.saveTrace({
            traceId: this.traceId,
            sessionId: this.sessionId,
            userId: this.userId,
            rawInput: this.rawInput,
            normalizedInput: this.normalizedInput,
            finalOutput: this.finalOutput,
            pipeline: this.pipeline,
            latency: totalLatency,
            geminiCalled: this.geminiCalled,
            cacheHit: this.cacheHit
          });
          console.log(`[TRACE] Saved to MongoDB: traceId=${this.traceId} latency=${totalLatency}ms`);
        } catch (e) {
          console.error('[TRACE-ERROR] Failed to save trace to MongoDB:', e.message);
        }
        
        try {
          const { emitToTraceRoom } = require('../../../src/services/socketService');
          const delivered = emitToTraceRoom('trace:completed', { traceId: this.traceId, latency: totalLatency });
          console.log(`[TRACE] Delivered to ${delivered} clients: trace:completed`);
        } catch (e) {
          console.error(`[TRACE-ERROR] Failed to emit trace:completed:`, e.message);
        }
        
        return this;
      }
    };

    console.log(`\n[TRACE] Created Trace: ${context.traceId} | Input: "${context.rawInput}"`);

    try {
      const { emitToTraceRoom } = require('../../../src/services/socketService');
      const delivered = emitToTraceRoom('trace:started', { 
        traceId: context.traceId,
        rawInput: context.rawInput,
        pipeline: []
      });
      console.log(`[TRACE] Delivered to ${delivered} clients: trace:started`);
    } catch (e) { 
      console.error(`[TRACE-ERROR] Failed to emit trace:started:`, e.message);
    }

    return context;
  }
}

module.exports = new TraceService();
