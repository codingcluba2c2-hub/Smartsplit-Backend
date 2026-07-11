const IntentResult = require('../dto/IntentResult');

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

  detect(text) {
    const exactMatch = this.staticResponses[text];
    if (exactMatch) {
      const result = new IntentResult('FastPath', 100, 'Exact FastPath Match');
      result.payload = exactMatch;
      return result;
    }
    return new IntentResult('Unknown', 0, 'No FastPath match');
  }
}

module.exports = new FastPathService();
