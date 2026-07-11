/**
 * Enterprise AI Configuration
 * Centralized settings without magic numbers or hardcoded thresholds.
 */
module.exports = {
  thresholds: {
    SPELLCHECK_MAX_DISTANCE: 2,
    FAQ_EXACT_MATCH: 100,
    FAQ_NORMALIZED_MATCH: 90,
    FAQ_ALIAS_MATCH: 85,
    FAQ_FUZZY_MATCH: 75,
    INTENT_CONFIDENCE_MIN: 60, // Minimum confidence to accept an intent
  },
  caching: {
    enableMemoryCache: true,
    cacheTTLSeconds: 3600,
  }
};
