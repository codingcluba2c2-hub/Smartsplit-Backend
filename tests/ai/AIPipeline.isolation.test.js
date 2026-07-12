const AIPipelineService = require('../../modules/ai/services/AIPipelineService');
const intentService = require('../../modules/ai/intent/IntentService');
const ContextDecisionEngine = require('../../modules/ai/context/ContextDecisionEngine');
const PromptSanitizer = require('../../modules/ai/prompts/PromptSanitizer');

describe('Context Isolation Architecture', () => {
  it('should block RAG and DB for isolated intents (Greeting)', () => {
    const rules = ContextDecisionEngine.evaluate('Greeting');
    expect(rules.requiresRAG).toBe(false);
    expect(rules.requiresDB).toBe(false);
    expect(rules.requiresHistory).toBe(false);
  });

  it('should sanitize leaked business entities from isolated prompts', () => {
    const rawPrompt = `
      You are an AI.
      Knowledge Base Context:
      Here is your expense policy.
      
      Conversation History:
      User: how are you
      
      User Names: Rahul
      Trips: Blue Water Paradise Resort
    `;
    
    const result = PromptSanitizer.sanitize(rawPrompt, 'Greeting');
    
    expect(result.removedEntities).toContain('Trip Name');
    expect(result.removedEntities).toContain('User Names');
    expect(result.removedEntities).toContain('RAG Context Block');
    expect(result.sanitizedPrompt).not.toMatch(/Blue Water Paradise Resort/i);
    expect(result.sanitizedPrompt).not.toMatch(/Rahul/i);
    expect(result.sanitizedPrompt).not.toMatch(/Knowledge Base Context/i);
  });

  it('should NOT sanitize prompts for non-isolated intents (Database)', () => {
    const rawPrompt = `Rahul's trip to Blue Water Paradise Resort expenses`;
    const result = PromptSanitizer.sanitize(rawPrompt, 'Database');
    
    expect(result.removedEntities.length).toBe(0);
    expect(result.sanitizedPrompt).toMatch(/Blue Water Paradise Resort/i);
    expect(result.sanitizedPrompt).toMatch(/Rahul/i);
  });
});
