const OpenAIProvider = require('./OpenAIProvider');
const ClaudeProvider = require('./ClaudeProvider');
const GeminiProvider = require('./GeminiProvider');
const DeepSeekProvider = require('./DeepSeekProvider');
const OllamaProvider = require('./OllamaProvider');

class LLMFactory {
  static create(providerName) {
    switch (providerName.toLowerCase()) {
      case 'openai': return new OpenAIProvider();
      case 'claude': return new ClaudeProvider();
      case 'gemini': return new GeminiProvider();
      case 'deepseek': return new DeepSeekProvider();
      case 'ollama': return new OllamaProvider();
      default: throw new Error(`Unknown LLM provider: ${providerName}`);
    }
  }
}
module.exports = LLMFactory;