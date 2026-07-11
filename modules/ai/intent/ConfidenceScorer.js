const aiConfig = require('../config/aiConfig');

class ConfidenceScorer {
  static getBestIntent(intentResults) {
    let best = intentResults[0];
    for (const result of intentResults) {
      if (result.confidence > best.confidence) {
        best = result;
      }
    }
    
    if (best.confidence < aiConfig.thresholds.INTENT_CONFIDENCE_MIN) {
      best.intent = 'Fallback';
      best.reason = 'Confidence too low';
      best.payload = 'I am not sure how to help with that. Would you like to speak to a human?';
    }
    return best;
  }
}

module.exports = ConfidenceScorer;
