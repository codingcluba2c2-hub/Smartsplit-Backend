const express = require('express');
const router = express.Router();
const traceController = require('./TraceController');

// All routes are implicitly under /api/admin/ai/trace (mounted in main app)
router.get('/', traceController.getRecentTraces);
router.get('/:traceId', traceController.getTraceById);

module.exports = router;
