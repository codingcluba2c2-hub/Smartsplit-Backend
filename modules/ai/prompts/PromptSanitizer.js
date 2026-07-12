class PromptSanitizer {
  /**
   * Cleanses the prompt of any accidentally leaked business entities if the intent is isolated.
   * @param {string} prompt The fully assembled prompt
   * @param {string} intent The detected intent
   * @returns {Object} { sanitizedPrompt, removedEntities, reason }
   */
  static sanitize(prompt, intent) {
    const isolatedIntents = ['Greeting', 'Small Talk', 'Farewell', 'Thanks', 'Identity'];
    
    if (!isolatedIntents.includes(intent)) {
      return { 
        sanitizedPrompt: prompt, 
        removedEntities: [], 
        reason: 'Intent does not require strict isolation.' 
      };
    }

    let sanitizedPrompt = prompt;
    const removedEntities = [];
    
    // Fast heuristic pruning using Regex
    const forbiddenPatterns = [
      { regex: /Blue Water Paradise Resort/gi, label: 'Trip Name' },
      { regex: /Rahul|Amit|Sneha/gi, label: 'User Names' },
      { regex: /\$\d+|\₹\d+|expenses?|settlements?|balances?/gi, label: 'Financial Data' },
      { regex: /Knowledge Base Context:[\s\S]*?(?=\n\n|$)/gi, label: 'RAG Context Block' },
      { regex: /Database Context:[\s\S]*?(?=\n\n|$)/gi, label: 'DB Context Block' },
      { regex: /Conversation History:[\s\S]*?(?=\n\n|$)/gi, label: 'History Block' }
    ];

    forbiddenPatterns.forEach(({ regex, label }) => {
      if (regex.test(sanitizedPrompt)) {
        sanitizedPrompt = sanitizedPrompt.replace(regex, '');
        if (!removedEntities.includes(label)) {
          removedEntities.push(label);
        }
      }
    });

    // Clean up multiple newlines caused by pruning
    sanitizedPrompt = sanitizedPrompt.replace(/\n{3,}/g, '\n\n').trim();

    return {
      sanitizedPrompt,
      removedEntities,
      reason: removedEntities.length > 0 
        ? `Strict isolation enforced for '${intent}'. Pruned leaked entities.` 
        : 'Prompt was already clean.'
    };
  }
}

module.exports = PromptSanitizer;
