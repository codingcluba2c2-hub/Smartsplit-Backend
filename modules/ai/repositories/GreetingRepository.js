const Greeting = require('../models/Greeting');

class GreetingRepository {
  async getAllActive() {
    return Greeting.find({ status: { $ne: 'disabled' } }).sort({ priority: -1 }).lean();
  }

  async findMatchingRule(text) {
    if (!text || typeof text !== 'string') return null;
    const activeRules = await this.getAllActive();
    const lowerText = text.trim().toLowerCase();
    const cleanText = lowerText.replace(/[^\w\s]/gi, '').trim();

    for (const rule of activeRules) {
      // 1. Check Regex generated or custom pattern
      if (rule.regexGenerated) {
        try {
          const regex = new RegExp(rule.regexGenerated, 'i');
          if (regex.test(text) || regex.test(lowerText) || (cleanText && regex.test(cleanText))) {
            return rule;
          }
        } catch (e) {
          // Ignore regex compilation issues
        }
      }

      // 2. Check Aliases
      if (rule.aliases && Array.isArray(rule.aliases)) {
        for (const alias of rule.aliases) {
          const lowerAlias = alias.trim().toLowerCase();
          const cleanAlias = lowerAlias.replace(/[^\w\s]/gi, '').trim();
          if (!lowerAlias) continue;

          if (
            lowerText === lowerAlias ||
            (cleanAlias && cleanText === cleanAlias) ||
            (lowerAlias.length >= 3 && lowerText.includes(lowerAlias)) ||
            (cleanAlias.length >= 3 && cleanText.includes(cleanAlias))
          ) {
            return rule;
          }
        }
      }

      // 3. Check Rule Name
      if (rule.name) {
        const lowerName = rule.name.trim().toLowerCase();
        if (lowerName.length >= 3 && (lowerText === lowerName || lowerText.includes(lowerName))) {
          return rule;
        }
      }
    }

    return null;
  }
}

module.exports = new GreetingRepository();
