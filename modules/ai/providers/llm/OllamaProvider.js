const ILLMProvider = require('./ILLMProvider');
class OllamaProvider extends ILLMProvider {
  async generate(messages, options = {}) { return { content: "Mock Ollama response.", usage: {} }; }
}
module.exports = OllamaProvider;