class ILLMProvider {
  /**
   * Abstract interface for LLM providers
   */
  async generate(messages, options = {}) { throw new Error('Not Implemented'); }
  async stream(messages, options = {}, onToken) { throw new Error('Not Implemented'); }
  async callTools(messages, tools, options = {}) { throw new Error('Not Implemented'); }
}
module.exports = ILLMProvider;