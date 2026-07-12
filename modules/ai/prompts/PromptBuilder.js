class PromptBuilder {
  /**
   * Builds a dynamically injected prompt avoiding Context Pollution.
   */
  static buildPrompt(intent, userContext, dataContext = {}, rules) {
    let loadedSources = [];
    let discardedSources = [];
    let promptTokens = 0;
    
    // Base System Prompt
    let prompt = `You are SmartSplit AI, an enterprise expense sharing assistant.
Current Date: ${new Date().toISOString()}
User Name: ${userContext.name || 'Unknown'}

Guidelines:
1. Be helpful, concise, and professional.
2. Format financial numbers beautifully (e.g., ₹2,500).
3. Do not expose raw JSON in your final answer.
`;
    promptTokens += prompt.length / 4; // rough estimate

    // Response Style Router
    if (rules.maxLengthStyle && rules.maxLengthStyle !== 'default') {
      prompt += `4. CRITICAL: Keep your response very concise (Maximum length: ${rules.maxLengthStyle}). Answer directly without conversational filler.\n`;
    }

    prompt += `\n`;

    // Dynamic Context Injection
    if (rules.requiresRAG && dataContext.knowledgeChunks && dataContext.knowledgeChunks.length > 0) {
      prompt += `Knowledge Base Context:\n`;
      loadedSources.push('RAG');
      
      dataContext.knowledgeChunks.forEach((chunk, i) => {
        const chunkStr = `[Document ${i+1}]: ${chunk.text}\n`;
        const chunkTokens = chunkStr.length / 4;
        
        // Context Budget Manager
        if (promptTokens + chunkTokens <= rules.maxTokens) {
          prompt += chunkStr;
          promptTokens += chunkTokens;
        } else {
          discardedSources.push(`RAG Document ${i+1} (Budget exceeded)`);
        }
      });
    }

    if (rules.requiresDB && dataContext.toolResponses) {
      loadedSources.push('Database');
      const dbStr = `Database Context:\nTool responses: ${JSON.stringify(dataContext.toolResponses)}\n`;
      prompt += dbStr;
      promptTokens += dbStr.length / 4;
    }

    if (rules.requiresHistory && dataContext.history) {
      loadedSources.push('Conversation History');
      const histStr = `Conversation History:\n${dataContext.history}\n`;
      prompt += histStr;
      promptTokens += histStr.length / 4;
    }

    const metrics = {
      loadedSources,
      discardedSources,
      tokenCount: Math.round(promptTokens),
      reasoning: `Context decided by Intent: ${intent}. Allowed DB: ${rules.requiresDB}, RAG: ${rules.requiresRAG}`
    };

    return { finalPrompt: prompt, metrics };
  }
}

module.exports = PromptBuilder;