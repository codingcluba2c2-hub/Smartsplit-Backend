const ILLMProvider = require('./ILLMProvider');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiProvider extends ILLMProvider {
  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.modelName = process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash";
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }
  }

  getModel(name) {
    if (!this.genAI) return null;
    return this.genAI.getGenerativeModel({ model: name || this.modelName || "gemini-3.6-flash" });
  }

  async generate(messages, options = {}) {
    if (!this.genAI) {
      return { content: "⚠️ Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file to enable the AI assistant to answer questions.", usage: {} };
    }

    const candidateModels = [
      process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-flash-latest"
    ];

    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    let lastError = null;
    for (const mName of candidateModels) {
      try {
        const activeModel = this.genAI.getGenerativeModel({ model: mName });
        const result = await activeModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text) {
          this.modelName = mName;
          this.model = activeModel;
          return { content: text, usage: {} };
        }
      } catch (error) {
        lastError = error;
        console.error(`[GeminiProvider] Error with model ${mName}:`, error?.message || error);
      }
    }

    console.error("All Gemini model attempts failed:", lastError);
    throw lastError || new Error("Gemini generation failed");
  }

  async callTools(messages, tools, options = {}) {
    if (!this.genAI) return { content: "Missing API Key", usage: {} };

    try {
      const activeModel = this.model || this.getModel("gemini-3.6-flash");
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
      const result = await activeModel.generateContent({
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