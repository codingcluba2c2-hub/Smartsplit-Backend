const RegexRules = require('../models/RegexRules');

class RegexRuleRepository {
  async getAllActive() {
    return RegexRules.find({ isActive: true }).lean();
  }
}

module.exports = new RegexRuleRepository();
