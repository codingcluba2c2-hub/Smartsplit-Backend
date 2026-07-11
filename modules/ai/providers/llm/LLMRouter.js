const LLMFactory = require('./LLMFactory');
const RetryHandler = require('./RetryHandler');

class LLMRouter {
  constructor(primaryProvider = 'gemini', fallbackProvider = 'openai') {
    this.primary = LLMFactory.create(primaryProvider);
    this.fallback = LLMFactory.create(fallbackProvider);
  }

  async generate(messages, options = {}) {
    try {
      return await RetryHandler.executeWithRetry(() => this.primary.generate(messages, options), 2);
    } catch (e) {
      console.log('[LLMRouter] Primary failed, falling back to secondary provider');
      return await this.fallback.generate(messages, options);
    }
  }

  async callTools(messages, tools, options = {}) {
    return await RetryHandler.executeWithRetry(() => this.primary.callTools(messages, tools, options), 2);
  }
}
module.exports = new LLMRouter();