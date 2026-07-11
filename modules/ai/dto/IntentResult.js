/**
 * Data Transfer Object for Intent Detection results.
 */
class IntentResult {
  constructor(intent, confidence, reason, matchedKeywords = [], matchedAliases = [], matchedRegex = []) {
    this.intent = intent;
    this.confidence = confidence;
    this.reason = reason;
    this.matchedKeywords = matchedKeywords;
    this.matchedAliases = matchedAliases;
    this.matchedRegex = matchedRegex;
    this.payload = null; // Can hold specific payload, e.g. FAQ answer
  }
}

module.exports = IntentResult;
