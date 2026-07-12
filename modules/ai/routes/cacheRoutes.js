const express = require('express');
const router = express.Router();
const CacheManager = require('../cache/CacheManager');

// POST /api/admin/ai/cache/clear
router.post('/clear', async (req, res) => {
  try {
    await CacheManager.clearAll();
    res.json({ success: true, message: 'All caches cleared successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/ai/cache/semantic
router.post('/semantic', async (req, res) => {
  try {
    await CacheManager.clearSemantic();
    res.json({ success: true, message: 'Semantic cache cleared successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/ai/cache/conversation
router.post('/conversation', (req, res) => {
  try {
    CacheManager.clearConversation();
    res.json({ success: true, message: 'Conversation memory cleared successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/ai/cache/intent
router.post('/intent', (req, res) => {
  try {
    CacheManager.clearIntentCache();
    res.json({ success: true, message: 'Intent cache reload triggered.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/ai/cache/regex
router.post('/regex', (req, res) => {
  try {
    CacheManager.clearRegexCache();
    res.json({ success: true, message: 'Regex cache reload triggered.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/ai/cache/alias
router.post('/alias', (req, res) => {
  try {
    CacheManager.clearAliasCache();
    res.json({ success: true, message: 'Alias cache reload triggered.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/ai/cache/status
router.get('/status', async (req, res) => {
  try {
    const status = await CacheManager.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
