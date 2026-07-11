const traceStore = require('./TraceStore');
const simulator = require('./AILogicSimulator');

/**
 * DebuggerController
 * Exposes the /api/ai/debugger routes for the frontend Developer Mode UI.
 * Restricted to Owner/Admin via middleware.
 */
class DebuggerController {
  
  async getTraces(req, res) {
    try {
      const traces = traceStore.getAllTraces();
      res.status(200).json(traces);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTraceDetails(req, res) {
    try {
      const { traceId } = req.params;
      const trace = traceStore.getTrace(traceId);
      if (!trace) return res.status(404).json({ error: 'Trace not found' });
      res.status(200).json(trace);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async runSimulation(req, res) {
    try {
      const { originalTraceId, overrideParams } = req.body;
      const result = await simulator.simulate(originalTraceId, overrideParams);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new DebuggerController();