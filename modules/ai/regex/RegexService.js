const regexRepo = require('../repositories/RegexRuleRepository');
const IntentResult = require('../dto/IntentResult');

class RegexService {
  constructor() {
    this.compiledPatterns = [];
    this.isLoaded = false;
  }

  async loadRules() {
    try {
      const activeRules = await regexRepo.getAllActive();
      this.compiledPatterns = [];
      for (const rule of activeRules) {
        try {
          this.compiledPatterns.push({
            intentName: rule.intentName,
            regex: new RegExp(rule.pattern, rule.flags || 'i')
          });
        } catch (e) {
          console.error(`[RegexService] Failed to compile regex for intent ${rule.intentName}: ${rule.pattern}`);
        }
      }
      this.isLoaded = true;
      console.log(`[RegexService] Compiled ${this.compiledPatterns.length} regex rules from MongoDB`);
    } catch (err) {
      console.error('[RegexService] Failed to load regex rules:', err);
      this.isLoaded = true;
    }
  }

  async match(text) {
    if (!this.isLoaded) await this.loadRules();
    
    // Check for exact intent matches
    for (const patternObj of this.compiledPatterns) {
      if (patternObj.regex.test(text)) {
        // Return 1.0 confidence since it's a strict regex match
        return new IntentResult(patternObj.intentName, 1.0, 'Matched strict regex rule');
      }
    }
    return new IntentResult('Unknown', 0, 'No regex rules matched');
  }
}

module.exports = new RegexService();
