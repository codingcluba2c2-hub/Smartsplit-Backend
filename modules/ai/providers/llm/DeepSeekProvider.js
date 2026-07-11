const ILLMProvider = require('./ILLMProvider');
class DeepSeekProvider extends ILLMProvider {
  async generate(messages, options = {}) { return { content: "Mock DeepSeek response.", usage: {} }; }
}
module.exports = DeepSeekProvider;