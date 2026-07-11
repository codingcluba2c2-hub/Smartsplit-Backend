const ConfidenceScorer = require('./ConfidenceScorer');
const IntentResult = require('../dto/IntentResult');
const fastPathService = require('../fastpath/FastPathService');
const greetingService = require('../greetings/GreetingService');
const faqService = require('../faq/FAQService');
const hybridRetriever = require('../retrieval/HybridRetriever');

class IntentService {
  async detect(text) {
    const lowerText = text.toLowerCase();

    // 1. Fast Path
    const fastPath = fastPathService.detect(text);
    if (fastPath.confidence >= 0.8) return fastPath;
    
    // 2. Greetings
    const greeting = greetingService.detect(text);
    if (greeting.confidence >= 0.8) return greeting;
    
    // 3. FAQ
    const faq = faqService.detect(text);
    if (faq.confidence >= 0.8) return faq;
    
    // 4. Personal Data (Database Queries)
    // Local regex to detect if user is asking about balances, owes, groups
    if (/(balance|owe|pay|due|group|how much|my share|pending)/.test(lowerText)) {
      return new IntentResult('Database', 100, 'User is asking about personal account data');
    }
    
    // 5. Default to RAG Knowledge Base
    return new IntentResult('Unknown', 0, 'Fallback to RAG Knowledge Base');
  }
}

module.exports = new IntentService();
