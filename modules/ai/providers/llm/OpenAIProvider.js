const ILLMProvider = require('./ILLMProvider');
class OpenAIProvider extends ILLMProvider {
  async generate(messages, options = {}) {
    return { content: "I specialize in managing your SmartSplit accounts, including balances, settlements, and group expenses. Could you please ask a question related to these topics?", usage: { promptTokens: 10, completionTokens: 10 } };
  }
  async callTools(messages, tools, options = {}) {
    return {
      toolCalls: [{ name: tools[0].name, arguments: {} }],
      usage: { promptTokens: 15, completionTokens: 5 }
    };
  }
}
module.exports = OpenAIProvider;