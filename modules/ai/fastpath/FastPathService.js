const IntentResult = require('../dto/IntentResult');
const greetingRepo = require('../repositories/GreetingRepository');

class FastPathService {
  constructor() {
    this.staticResponses = {
      'help': 'I am the SmartSplit Assistant. I can help you manage your groups, expenses, and settlements.',
      'menu': 'Main Menu: \n1. Dashboard\n2. Groups\n3. Expenses',
      'about smartsplit': 'SmartSplit is an Enterprise Expense Sharing Platform.',
      'support': 'For support, please contact admin@smartsplit.com.',
      'version': 'SmartSplit AI Engine v1.0.0'
    };
  }

  async detect(text) {
    const cleanText = (text || '').trim().toLowerCase();
    const exactMatch = this.staticResponses[cleanText];
    if (exactMatch) {
      const result = new IntentResult('FastPath', 1.0, 'Exact FastPath Match');
      result.payload = exactMatch;
      return result;
    }

    const matchedRule = await greetingRepo.findMatchingRule(text);
    if (matchedRule && (matchedRule.intent === 'fastpath' || matchedRule.intent === 'faq')) {
      const intentName = matchedRule.intent === 'fastpath' ? 'FastPath' : 'FAQ';
      const result = new IntentResult(intentName, 0.98, `Matched Rule: ${matchedRule.name}`);
      result.payload = matchedRule.responseTemplate;
      return result;
    }

    return new IntentResult('Unknown', 0, 'No FastPath match');
  }
}

module.exports = new FastPathService();
