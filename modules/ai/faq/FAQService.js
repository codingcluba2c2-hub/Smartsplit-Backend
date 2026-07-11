const IntentResult = require('../dto/IntentResult');
const aiConfig = require('../config/aiConfig');

class FAQService {
  constructor() {
    // Mock FAQs for testing without DB
    this.faqs = [
      { question: 'what is smartsplit', answer: 'SmartSplit is an Enterprise Expense Sharing Platform.', keywords: ['smartsplit', 'what'] },
      { question: 'how to create group', answer: 'Go to the Groups tab and click "Create Group".', keywords: ['create', 'group'] },
      { question: 'how do i create expense', answer: 'Inside a group, click "Add Expense".', keywords: ['create', 'add', 'expense'] },
      { question: 'how can i add payment', answer: 'You can add a payment in the settlement tab.', keywords: ['add', 'payment', 'settle'] },
      { question: 'how to settle', answer: 'Go to the Settlements tab to clear your dues.', keywords: ['settle', 'dues'] }
    ];
  }

  detect(text) {
    // 1. Exact Match
    let match = this.faqs.find(f => f.question === text);
    if (match) {
      const result = new IntentResult('FAQ', aiConfig.thresholds.FAQ_EXACT_MATCH, 'Exact FAQ Match');
      result.payload = match.answer;
      return result;
    }
    
    // 2. Keyword/Partial Match (simplified for now)
    let bestScore = 0;
    let bestFaq = null;
    
    for (const faq of this.faqs) {
      const matches = faq.keywords.filter(k => text.includes(k)).length;
      if (matches > 0) {
        const score = Math.min((matches / faq.keywords.length) * 100, aiConfig.thresholds.FAQ_NORMALIZED_MATCH);
        if (score > bestScore) {
          bestScore = score;
          bestFaq = faq;
        }
      }
    }
    
    if (bestScore >= aiConfig.thresholds.INTENT_CONFIDENCE_MIN) {
      const result = new IntentResult('FAQ', bestScore, 'Partial/Keyword Match');
      result.payload = bestFaq.answer;
      return result;
    }
    
    return new IntentResult('Unknown', 0, 'No FAQ match');
  }
}

module.exports = new FAQService();
