class ContextDecisionEngine {
  /**
   * Evaluates the detected intent and determines which context sources are strictly allowed.
   * @param {string} intent The detected intent (e.g. 'Greeting', 'Database', 'Unknown')
   * @returns {Object} Rules governing context loading for this specific intent.
   */
  static evaluate(intent) {
    const rules = {
      requiresDB: false,
      requiresRAG: false,
      requiresHistory: false,
      maxTokens: 1000,
      maxLengthStyle: 'default'
    };

    switch (intent) {
      case 'Greeting':
        rules.maxLengthStyle = '10-20 words';
        break;
      case 'Small Talk':
        rules.maxLengthStyle = '15-25 words';
        break;
      case 'Thanks':
        rules.maxLengthStyle = '10 words';
        break;
      case 'Farewell':
        rules.maxLengthStyle = '15 words';
        break;
      case 'Identity':
        rules.maxLengthStyle = '20 words';
        break;
      case 'Help':
        rules.maxLengthStyle = '40 words';
        break;
      case 'FAQ':
        rules.maxLengthStyle = '40 words';
        break;
      case 'Database':
        rules.requiresDB = true;
        rules.requiresHistory = true;
        rules.maxTokens = 800; // Leave room for data
        rules.maxLengthStyle = '80 words';
        break;
      case 'Unknown':
      default:
        // By default, unknown queries might be knowledge base questions
        rules.requiresRAG = true;
        rules.requiresHistory = true;
        rules.maxTokens = 1500;
        rules.maxLengthStyle = '80 words';
        break;
    }

    return rules;
  }
}

module.exports = ContextDecisionEngine;
