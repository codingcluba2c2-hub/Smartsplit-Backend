const IntentResult = require('../dto/IntentResult');
const aiConfig = require('../config/aiConfig');
const greetingRepo = require('../repositories/GreetingRepository');

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

  async detect(text) {
    const cleanText = (text || '').trim().toLowerCase();

    // 1. Check DB rules
    const matchedRule = await greetingRepo.findMatchingRule(text);
    if (matchedRule) {
      const result = new IntentResult('FAQ', 0.98, `Matched Rule: ${matchedRule.name}`);
      result.payload = matchedRule.responseTemplate;
      return result;
    }

    // 2. Exact Match
    let match = this.faqs.find(f => f.question === cleanText);
    if (match) {
      const result = new IntentResult('FAQ', aiConfig.thresholds.FAQ_EXACT_MATCH, 'Exact FAQ Match');
      result.payload = match.answer;
      return result;
    }
    
    // 3. Keyword/Partial Match
    let bestScore = 0;
    let bestFaq = null;
    
    for (const faq of this.faqs) {
      const matches = faq.keywords.filter(k => cleanText.includes(k)).length;
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
