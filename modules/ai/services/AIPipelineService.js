const Normalizer = require('../utils/nlp/normalizer');
const SpellcheckService = require('../utils/nlp/spellcheck');
const aiConfig = require('../config/aiConfig');
const aliasService = require('../aliases/AliasService');
const regexService = require('../regex/RegexService');
const intentService = require('../intent/IntentService');
const contextManager = require('../memory/ContextManager');
const responseFormatter = require('../utils/ResponseFormatter');
const inputGuard = require('../middleware/safety/InputGuard');
const outputGuard = require('../middleware/safety/OutputGuard');
const llmRouter = require('../providers/llm/LLMRouter');
const toolManager = require('../tools/ToolManager');
const promptBuilder = require('../prompts/PromptBuilder');
const gibberishDetector = require('../utils/nlp/gibberishDetector');
const RetrievalService = require('../services/RetrievalService');

class AIPipelineService {
  constructor() {
    this.spellcheck = new SpellcheckService(aiConfig);
  }

  async processMessage(userId, sessionId, rawText) {
    const startTime = Date.now();
    let toolsExecuted = false;
    let finalResponse;
    let usedRAG = false;
    
    // 1. Safety Guard
    let text = inputGuard.sanitize(rawText);

    // 1.5 Gibberish Detection
    if (gibberishDetector.isGibberish(text)) {
      finalResponse = "I'm sorry, I couldn't quite understand that. I can assist you with your owed balances, settlements, and group expenses. Could you please rephrase your question?";
      contextManager.updateSession(sessionId, { user: rawText, bot: finalResponse }, 'Gibberish');
      return this._formatReturn(finalResponse, text, 'Gibberish', 1, 'Matched gibberish heuristics', startTime);
    }

    // 2. Normalize
    text = Normalizer.normalize(text);
    
    // 3. Spellcheck
    text = this.spellcheck.correctText(text);
    
    // 4. Alias Expansion
    const aliasResult = await aliasService.expand(text);
    text = aliasResult.text;
    
    // 5. Regex Matching
    const regexMatches = regexService.match(text);
    
    // 6. Intent Detection (Deterministic paths: Greetings, FastPath, FAQ, Database)
    const bestIntent = await intentService.detect(text);
    bestIntent.matchedAliases = aliasResult.matchedAliases;
    bestIntent.matchedRegex = regexMatches;
    
    // 7. Context Management
    const sessionContext = contextManager.getSession(userId, sessionId);
    
    // 8. Routing Logic
    // If we have a deterministic intent with high confidence (e.g., FAQ, Greeting, FastPath)
    if (bestIntent.confidence >= 0.8 && !['Unknown', 'Database'].includes(bestIntent.intent)) {
      finalResponse = responseFormatter.format(bestIntent);
    } 
    else if (bestIntent.intent === 'Database') {
      // 8a. Database Tools (User asked about personal info)
      const systemPrompt = promptBuilder.buildSystemPrompt({ name: 'User' }, []);
      const tools = toolManager.getToolSchemas();
      
      // Call Gemini once to let it pick the tool
      const llmResult = await llmRouter.callTools([{ role: 'system', content: systemPrompt }, { role: 'user', content: text }], tools);
      
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        toolsExecuted = true;
        const toolResponses = await toolManager.executeParallel(llmResult.toolCalls, sessionContext);
        const synthesizeResult = await llmRouter.generate([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
          { role: 'assistant', content: "Tool responses: " + JSON.stringify(toolResponses) + ". Answer the user in a helpful, conversational way based ONLY on this data. Do not show raw JSON." }
        ]);
        finalResponse = synthesizeResult.content;
      } else {
        finalResponse = "I couldn't fetch your account details at the moment. Please try again later.";
      }
    } 
    else {
      // 8b. Fallback to RAG Knowledge Base
      usedRAG = true;
      const ragResults = await RetrievalService.search(text, 5);
      
      if (ragResults && ragResults.length > 0) {
        // Build context from chunks
        const contextStr = ragResults.map(r => r.payload.text).join('\n\n');
        
        const systemPrompt = promptBuilder.buildSystemPrompt({ name: 'User' }, []);
        const ragPrompt = `Answer the user's question using the following enterprise knowledge:\n\n${contextStr}\n\nQuestion: ${text}`;
        
        // LLM with RAG Context
        const llmResult = await llmRouter.generate([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: ragPrompt }
        ]);
        
        finalResponse = llmResult.content || "I'm sorry, I couldn't formulate an answer from the knowledge base.";
      } else {
        // If RAG yields no results (similarity too low), return immediately without wasting Gemini tokens
        finalResponse = "I don't have information on this in my knowledge base. Please ask another question or provide more details.";
      }
    }
    
    // 9. Output Guard
    finalResponse = outputGuard.sanitize(finalResponse);

    // 10. Update Memory
    contextManager.updateSession(sessionId, { user: rawText, bot: finalResponse }, bestIntent.intent);
    
    return this._formatReturn(
      finalResponse, 
      text, 
      usedRAG ? 'KnowledgeBase_RAG' : bestIntent.intent, 
      bestIntent.confidence, 
      usedRAG ? 'Answered via Enterprise Knowledge Base' : bestIntent.reason, 
      startTime, 
      { matchedRegex: regexMatches, matchedAliases: aliasResult.matchedAliases, toolsExecuted }
    );
  }

  _formatReturn(response, normalizedText, intent, confidence, reason, startTime, extra = {}) {
    return {
      response,
      debug: {
        normalizedText,
        intent,
        confidence,
        reason,
        timeMs: Date.now() - startTime,
        ...extra
      }
    };
  }
}

module.exports = new AIPipelineService();