const { randomUUID } = require('crypto');
const traceStore = require('./TraceStore');
const sanitizer = require('./TraceSanitizer');

/**
 * AITracer (Observer Pattern)
 * The central telemetry engine tracking the AI lifecycle.
 */
class AITracer {
  startTrace(userId, conversationId) {
    const traceId = randomUUID();
    const trace = {
      traceId,
      userId,
      conversationId,
      startTime: Date.now(),
      spans: [],
      metadata: {},
      status: 'running'
    };
    traceStore.saveTrace(traceId, trace);
    return traceId;
  }

  startSpan(traceId, spanName) {
    const trace = traceStore.getTrace(traceId);
    if (!trace) return null;

    const spanId = randomUUID();
    const span = {
      spanId,
      name: spanName,
      startTime: Date.now(),
      events: [],
      status: 'running'
    };
    trace.spans.push(span);
    return spanId;
  }

  endSpan(traceId, spanId, output = null) {
    const trace = traceStore.getTrace(traceId);
    if (!trace) return;

    const span = trace.spans.find(s => s.spanId === spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.status = 'completed';
      if (output) span.output = sanitizer.sanitize(output);
    }
  }

  addEvent(traceId, spanId, eventName, payload) {
    const trace = traceStore.getTrace(traceId);
    if (!trace) return;

    const span = trace.spans.find(s => s.spanId === spanId);
    if (span) {
      span.events.push({
        timestamp: Date.now(),
        name: eventName,
        payload: sanitizer.sanitize(payload)
      });
    }
  }

  endTrace(traceId, finalResponse) {
    const trace = traceStore.getTrace(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = 'completed';
    trace.finalResponse = sanitizer.sanitize(finalResponse);
  }

  recordError(traceId, error) {
    const trace = traceStore.getTrace(traceId);
    if (!trace) return;

    trace.status = 'error';
    trace.error = error.message || error.toString();
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
  }
}

module.exports = new AITracer();