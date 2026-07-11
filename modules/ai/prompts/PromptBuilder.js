class PromptBuilder {
  static buildSystemPrompt(userContext, knowledgeChunks = [], date = new Date()) {
    let prompt = `You are SmartSplit AI, an enterprise expense sharing assistant.
Current Date: ${date.toISOString()}
User Name: ${userContext.name || 'Unknown'}

Guidelines:
1. Be helpful, concise, and professional.
2. Format financial numbers beautifully (e.g., ₹2,500).
3. Do not expose raw JSON in your final answer.
`;

    if (knowledgeChunks.length > 0) {
      prompt += `\n\nKnowledge Base Context:\n`;
      knowledgeChunks.forEach((chunk, i) => {
        prompt += `[Document ${i+1}]: ${chunk.text}\n`;
      });
    }

    return prompt;
  }
}
module.exports = PromptBuilder;