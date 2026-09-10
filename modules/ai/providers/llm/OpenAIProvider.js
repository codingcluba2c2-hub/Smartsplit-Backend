const ILLMProvider = require('./ILLMProvider');

class OpenAIProvider extends ILLMProvider {
  async generate(messages, options = {}) {
    if (process.env.OPENAI_API_KEY) {
      try {
        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo',
          messages: messages
        });
        return {
          content: response.choices[0]?.message?.content || "",
          usage: response.usage || {}
        };
      } catch (err) {
        console.error("[OpenAIProvider] API call failed:", err);
      }
    }
    
    // Fallback if no OpenAI key is configured
    const userMsg = messages[messages.length - 1]?.content || "";
    return { 
      content: `I'm SmartSplit AI assistant. How can I help you further with "${userMsg.slice(0, 50)}"?`, 
      usage: { promptTokens: 10, completionTokens: 10 } 
    };
  }

  async callTools(messages, tools, options = {}) {
    return {
      toolCalls: [],
      usage: { promptTokens: 0, completionTokens: 0 }
    };
  }
}
module.exports = OpenAIProvider;