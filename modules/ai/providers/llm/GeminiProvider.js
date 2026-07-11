const ILLMProvider = require('./ILLMProvider');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiProvider extends ILLMProvider {
  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    }
  }

  async generate(messages, options = {}) {
    if (!this.genAI) {
      return { content: "⚠️ Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file to enable the AI assistant to answer questions from your Knowledge Base.", usage: {} };
    }

    try {
      // Convert standard messages format to Gemini format
      // Gemini expects a single string prompt or a specific history format
      // For simplicity, we join the messages into a prompt
      const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return { content: text, usage: {} };
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  }

  async callTools(messages, tools, options = {}) {
    if (!this.genAI) return { content: "Missing API Key", usage: {} };

    try {
      // Map standard schema array to Gemini's functionDeclarations
      const geminiTools = [{
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: {
            type: "OBJECT",
            properties: t.parameters.properties,
            required: t.parameters.required || []
          }
        }))
      }];

      const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: geminiTools
      });

      const response = await result.response;
      const calls = response.functionCalls();
      
      let mappedCalls = [];
      if (calls && calls.length > 0) {
        mappedCalls = calls.map(c => ({
          name: c.name,
          arguments: c.args
        }));
      }

      return {
        content: response.text() || "",
        toolCalls: mappedCalls,
        usage: {}
      };
    } catch (error) {
      console.error("Gemini Tool Calling Error:", error);
      return { content: "", toolCalls: [], usage: {} };
    }
  }
}
module.exports = GeminiProvider;