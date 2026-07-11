const ILLMProvider = require('./ILLMProvider');
class ClaudeProvider extends ILLMProvider {
  async generate(messages, options = {}) {
    console.log('[Claude] Generating response');
    return { content: "This is a mock Claude response.", usage: { promptTokens: 10, completionTokens: 10 } };
  }
}
module.exports = ClaudeProvider;