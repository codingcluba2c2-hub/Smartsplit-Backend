const traceRepo = require('./TraceRepository');

exports.getRecentTraces = async (req, res) => {
  try {
    const traces = await traceRepo.getRecentTraces(req.query.limit ? parseInt(req.query.limit) : 20);
    res.json({ success: true, traces });
  } catch (error) {
    console.error('Error fetching traces:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch traces' });
  }
};

exports.getTraceById = async (req, res) => {
  try {
    const trace = await traceRepo.getTraceById(req.params.traceId);
    if (!trace) {
      return res.status(404).json({ success: false, error: 'Trace not found' });
    }
    res.json({ success: true, trace });
  } catch (error) {
    console.error('Error fetching trace:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trace' });
  }
};
