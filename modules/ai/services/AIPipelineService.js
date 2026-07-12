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
const TraceService = require('../devtrace/TraceService');

class AIPipelineService {
  constructor() {
    this.spellcheck = new SpellcheckService(aiConfig);
  }

  async processMessage(userId, sessionId, rawText) {
    const startTime = Date.now();
    const trace = TraceService.createContext(userId, sessionId, rawText);
    
    let toolsExecuted = false;
    let finalResponse;
    let usedRAG = false;
    
    // 0. Context Isolation: Reset transient variables
    trace.normalizedInput = null;
    trace.cacheHit = false;
    trace.geminiCalled = false;

    // Stage 1: Raw Input
    const sRaw = trace.startStage('Raw Input');
    trace.endStage(sRaw, 'SUCCESS', rawText, 1.0, 'Input received', { length: rawText.length });

    // 1. Safety Guard (Skipping detailed tracing for brevity)
    let text = inputGuard.sanitize(rawText);

    // Stage 2: Gibberish Detection
    const sGibb = trace.startStage('Gibberish Detector');
    if (gibberishDetector.isGibberish(text)) {
      trace.endStage(sGibb, 'SUCCESS', 'TRUE', 1.0, 'Detected gibberish', { input: text });
      trace.recordSkip('Normalizer', 'Gibberish aborted pipeline');
      trace.recordSkip('Intent Detector', 'Gibberish aborted pipeline');
      trace.recordSkip('LLM Router', 'Gibberish aborted pipeline');
      
      finalResponse = "I'm sorry, I couldn't quite understand that. I can assist you with your owed balances, settlements, and group expenses. Could you please rephrase your question?";
      contextManager.updateSession(sessionId, { user: rawText, bot: finalResponse }, 'Gibberish');
      
      const sFinal = trace.startStage('Final Response');
      trace.endStage(sFinal, 'SUCCESS', finalResponse, 1.0, 'Sent fallback');
      await trace.commit(finalResponse);
      
      return this._formatReturn(finalResponse, text, 'Gibberish', 1, 'Matched gibberish heuristics', startTime, { traceId: trace.traceId });
    }
    trace.endStage(sGibb, 'SUCCESS', 'FALSE', 1.0, 'Valid language', { input: text });

    // Stage 3: Normalize
    const sNorm = trace.startStage('Normalizer');
    text = Normalizer.normalize(text);
    trace.normalizedInput = text;
    trace.endStage(sNorm, 'SUCCESS', text, 1.0, 'Text normalized');
    
    // Stage 4: Spellcheck
    const sSpell = trace.startStage('Spell Check');
    const originalText = text;
    text = this.spellcheck.correctText(text);
    trace.endStage(sSpell, 'SUCCESS', text, 1.0, text !== originalText ? 'Corrected' : 'Unchanged', { original: originalText });
    
    // Stage 5: Alias Expansion
    const sAlias = trace.startStage('Alias Engine');
    const aliasResult = await aliasService.expand(text);
    text = aliasResult.text;
    trace.endStage(sAlias, 'SUCCESS', text, 1.0, aliasResult.matchedAliases.length > 0 ? 'Aliases expanded' : 'No aliases matched', { matched: aliasResult.matchedAliases });
    
    // Stage 6: Regex Matching
    const sRegex = trace.startStage('Regex Engine');
    const regexMatches = regexService.match(text);
    trace.endStage(sRegex, 'SUCCESS', regexMatches.length > 0 ? 'Matched' : 'No Match', 1.0, '', { matches: regexMatches });
    
    // Stage 7: Intent Detection
    const sIntent = trace.startStage('Intent Detector');
    const bestIntent = await intentService.detect(text);
    bestIntent.matchedAliases = aliasResult.matchedAliases;
    bestIntent.matchedRegex = regexMatches;
    trace.endStage(sIntent, 'SUCCESS', bestIntent.intent, bestIntent.confidence, bestIntent.reason);
    
    // 7. Context Management
    const sessionContext = contextManager.getSession(userId, sessionId);
    
    // 7b. Context Decision
    const ContextDecisionEngine = require('../context/ContextDecisionEngine');
    const sDecision = trace.startStage('Context Decision');
    const contextRules = ContextDecisionEngine.evaluate(bestIntent.intent);
    trace.endStage(sDecision, 'SUCCESS', `Need Context? ${contextRules.requiresDB || contextRules.requiresRAG ? 'YES' : 'NO'}`, 1.0, 'Evaluated by ContextDecisionEngine', contextRules);
    
    // 8. Routing Logic
    // Only use deterministic formatter if confidence is VERY high, otherwise let LLM handle it with strict context rules.
    if (bestIntent.confidence >= 0.95 && !['Unknown', 'Database'].includes(bestIntent.intent)) {
      trace.recordSkip('Database Lookup', 'Deterministic intent matched');
      trace.recordSkip('RAG Retrieval', 'Deterministic intent matched');
      trace.recordSkip('Semantic Cache', 'Deterministic intent matched');
      trace.recordSkip('Template Engine', 'Deterministic intent matched');
      trace.recordSkip('Prompt Construction', 'Deterministic intent matched');
      trace.recordSkip('LLM Router', 'Deterministic intent matched');
      
      finalResponse = responseFormatter.format(bestIntent);
    } 
    else if (bestIntent.intent === 'Database' && contextRules.requiresDB) {
      const sDb = trace.startStage('Database Lookup');
      const systemPromptResult = promptBuilder.buildPrompt(bestIntent.intent, { name: 'User' }, {}, contextRules);
      const tools = toolManager.getToolSchemas();
      
      const llmResult = await llmRouter.callTools([{ role: 'system', content: systemPromptResult.finalPrompt }, { role: 'user', content: text }], tools);
      
      if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
        toolsExecuted = true;
        const toolResponses = await toolManager.executeParallel(llmResult.toolCalls, sessionContext);
        trace.endStage(sDb, 'SUCCESS', 'Tools Executed', 1.0, 'Fetched database records', { tools: llmResult.toolCalls.map(t => t.name || (t.function && t.function.name) || 'Unknown Tool') });
        
        // --- TEMPLATE ENGINE INTERCEPTION ---
        const sTemp = trace.startStage('Template Engine');
        const TemplateEngine = require('../template/TemplateEngine');
        const templateResult = await TemplateEngine.generate('Database', 'Database', { ...sessionContext, toolResponses });
        if (templateResult.success) {
          trace.endStage(sTemp, 'SUCCESS', templateResult.response, 1.0, 'Template matched', { template: templateResult.templateUsed });
          trace.recordSkip('LLM Router', 'Template Engine successfully formatted DB response');
          
          finalResponse = templateResult.response;
          const sFinal = trace.startStage('Final Response');
          trace.endStage(sFinal, 'SUCCESS', finalResponse, 1.0, '');
          await trace.commit(finalResponse);
          
          return this._formatReturn(finalResponse, text, 'TemplateEngine_Hit', 1.0, `Template Matched`, startTime, { toolsExecuted, traceId: trace.traceId });
        }
        trace.endStage(sTemp, 'SKIPPED', null, 0, 'No DB template found');
        // --- END TEMPLATE INTERCEPTION ---

        const sBuilder = trace.startStage('Prompt Construction');
        const promptResult = promptBuilder.buildPrompt(bestIntent.intent, { name: 'User' }, { toolResponses }, contextRules);
        trace.endStage(sBuilder, 'SUCCESS', 'Prompt Built', 1.0, 'Context Applied', promptResult.metrics);

        const sLlm = trace.startStage('LLM Router');
        trace.geminiCalled = true;
        const synthesizeResult = await llmRouter.generate([
          { role: 'user', content: promptResult.finalPrompt + `\n\nUser Question: ${text}` }
        ]);
        finalResponse = synthesizeResult.content;
        trace.endStage(sLlm, 'SUCCESS', finalResponse, 1.0, 'Synthesized tool results', { provider: 'gemini', tokens: synthesizeResult.usage?.totalTokens });
      } else {
        trace.endStage(sDb, 'ERROR', null, 0, 'No tools selected by LLM');
        finalResponse = "I couldn't fetch your account details at the moment. Please try again later.";
      }
    } 
    else if (contextRules.requiresRAG) {
      // 8b. Fallback to RAG Knowledge Base
      trace.recordSkip('Database Lookup', 'Intent routed to Knowledge Base');
      const sRag = trace.startStage('RAG Retrieval');
      usedRAG = true;
      const ragResults = await RetrievalService.search(text, 5);
      
      if (ragResults && ragResults.length > 0) {
        trace.endStage(sRag, 'SUCCESS', `Found ${ragResults.length} chunks`, ragResults[0].score, 'Similarity above threshold', { topScore: ragResults[0].score });
        
        // --- SEMANTIC CACHE LOOKUP ---
        const sCache = trace.startStage('Semantic Cache');
        const SemanticCacheService = require('../cache/SemanticCacheService');
        const queryData = {
          normalizedText: text,
          intent: bestIntent.intent,
          canonicalText: text, 
          matchedRegex: bestIntent.matchedRegex ? bestIntent.matchedRegex.length > 0 : false
        };
        
        const cacheResult = await SemanticCacheService.checkCache(queryData);
        if (cacheResult.hit) {
          trace.cacheHit = true;
          trace.endStage(sCache, 'SUCCESS', cacheResult.response, cacheResult.score, cacheResult.matchType, { 
            "Cache Decision": "HIT",
            "Cache Type": "Semantic Cache",
            "Reason": `Similarity Match: ${cacheResult.score}`,
            cacheKey: cacheResult.cacheKey 
          });
          trace.recordSkip('Template Engine', 'Semantic Cache Hit');
          trace.recordSkip('LLM Router', 'Semantic Cache Hit');
          
          finalResponse = cacheResult.response;
          contextManager.updateSession(sessionId, { user: rawText, bot: finalResponse }, bestIntent.intent);
          
          const sFinal = trace.startStage('Final Response');
          trace.endStage(sFinal, 'SUCCESS', finalResponse, 1.0, '');
          await trace.commit(finalResponse);
          
          return this._formatReturn(finalResponse, text, 'SemanticCache_Hit', cacheResult.score, `Cache Matched`, startTime, { toolsExecuted, cacheKey: cacheResult.cacheKey, traceId: trace.traceId });
        } else if (cacheResult.skipReason) {
          trace.endStage(sCache, 'SKIPPED', null, 0, cacheResult.skipReason, {
            "Cache Decision": "SKIPPED",
            "Cache Type": "Semantic Cache",
            "Reason": cacheResult.skipReason
          });
        } else {
          trace.endStage(sCache, 'SKIPPED', null, 0, 'Cache Miss', {
            "Cache Decision": "MISS",
            "Cache Type": "Semantic Cache",
            "Reason": "No matching cache entry found"
          });
        }
        // --- END CACHE LOOKUP ---

        const contextStr = ragResults.map(r => r.payload.text).join('\n\n');
        const chunkIds = ragResults.map(r => r.payload._id);
        
        // --- TEMPLATE ENGINE INTERCEPTION (KNOWLEDGE) ---
        const sTemp = trace.startStage('Template Engine');
        const TemplateEngine = require('../template/TemplateEngine');
        const templateContext = {
          ...sessionContext,
          documentName: ragResults[0]?.payload?.metadata?.documentName || 'Knowledge Base',
          page: ragResults[0]?.payload?.metadata?.page || 1,
          summary: contextStr,
          confidence: '95%'
        };
        const templateResult = await TemplateEngine.generate(bestIntent.intent, 'Knowledge', templateContext);
        
        if (templateResult.success) {
          trace.endStage(sTemp, 'SUCCESS', templateResult.response, 1.0, 'Template matched', { template: templateResult.templateUsed });
          trace.recordSkip('LLM Router', 'Template Engine successfully formatted RAG response');
          
          finalResponse = templateResult.response;
          await SemanticCacheService.storeResponse(queryData, { response: finalResponse, chunkIds, tokenUsage: 0, provider: 'template_engine' });
          
          const sFinal = trace.startStage('Final Response');
          trace.endStage(sFinal, 'SUCCESS', finalResponse, 1.0, '');
          await trace.commit(finalResponse);
          
          return this._formatReturn(finalResponse, text, 'TemplateEngine_Hit', 1.0, `Template Matched`, startTime, { toolsExecuted, cacheKey: queryData.cacheKey, traceId: trace.traceId });
        }
        trace.endStage(sTemp, 'SKIPPED', null, 0, 'No RAG template found');
        // --- END TEMPLATE INTERCEPTION ---
        
        const sBuilder = trace.startStage('Prompt Construction');
        const promptResult = promptBuilder.buildPrompt(bestIntent.intent, { name: 'User' }, { knowledgeChunks: ragResults.map(r => r.payload) }, contextRules);
        trace.endStage(sBuilder, 'SUCCESS', 'Prompt Built', 1.0, 'Strict Context Applied', promptResult.metrics);

        const sLlm = trace.startStage('LLM Router');
        trace.geminiCalled = true;
        
        const llmResult = await llmRouter.generate([
          { role: 'user', content: promptResult.finalPrompt + `\n\nQuestion: ${text}` }
        ]);
        
        finalResponse = llmResult.content || "I'm sorry, I couldn't formulate an answer from the knowledge base.";
        trace.endStage(sLlm, 'SUCCESS', finalResponse, 1.0, 'Generated answer', { provider: 'gemini', tokens: llmResult.usage?.totalTokens });

        if (llmResult.content) {
          await SemanticCacheService.storeResponse(queryData, {
            response: finalResponse, chunkIds, tokenUsage: llmResult.usage?.totalTokens || 0, provider: 'gemini'
          });
        }
      } else {
        trace.endStage(sRag, 'SKIPPED', null, 0, 'Similarity below threshold');
        trace.recordSkip('Semantic Cache', 'No RAG results');
        trace.recordSkip('Template Engine', 'No RAG results');
        trace.recordSkip('Prompt Construction', 'No RAG results');
        trace.recordSkip('LLM Router', 'No RAG results');
        finalResponse = "I don't have information on this in my knowledge base. Please ask another question or provide more details.";
      }
    }
    else {
      // Intent strictly bypasses Database and RAG (e.g. Greeting, Small Talk)
      trace.recordSkip('Database Lookup', 'ContextDecisionEngine blocked DB');
      trace.recordSkip('RAG Retrieval', 'ContextDecisionEngine blocked RAG');
      trace.recordSkip('Semantic Cache', 'Bypassed external context');
      trace.recordSkip('Template Engine', 'Bypassed external context');
      
      const sBuilder = trace.startStage('Prompt Construction');
      const promptResult = promptBuilder.buildPrompt(bestIntent.intent, { name: 'User' }, {}, contextRules);
      
      // Context Isolation: Prompt Sanitization
      const PromptSanitizer = require('../prompts/PromptSanitizer');
      const sSanitize = trace.startStage('Prompt Sanitizer');
      const sanitizeResult = PromptSanitizer.sanitize(promptResult.finalPrompt, bestIntent.intent);
      
      if (sanitizeResult.removedEntities.length > 0) {
        trace.endStage(sSanitize, 'SUCCESS', 'Sanitized', 1.0, sanitizeResult.reason, { removed: sanitizeResult.removedEntities });
      } else {
        trace.endStage(sSanitize, 'SKIPPED', 'Clean', 1.0, sanitizeResult.reason);
      }
      
      trace.endStage(sBuilder, 'SUCCESS', 'Prompt Built', 1.0, 'Zero-Context Prompt', promptResult.metrics);

      const sLlm = trace.startStage('LLM Router');
      trace.geminiCalled = true;
      const llmResult = await llmRouter.generate([
        { role: 'user', content: sanitizeResult.sanitizedPrompt + `\n\nUser: ${text}` }
      ]);
      finalResponse = llmResult.content || "Hello!";
      trace.endStage(sLlm, 'SUCCESS', finalResponse, 1.0, 'Generated base answer', { provider: 'gemini', tokens: llmResult.usage?.totalTokens });
    }
    
    // 9. Output Guard
    finalResponse = outputGuard.sanitize(finalResponse);

    // 10. Update Memory
    contextManager.updateSession(sessionId, { user: rawText, bot: finalResponse }, bestIntent.intent);
    
    const sFinal = trace.startStage('Final Response');
    trace.endStage(sFinal, 'SUCCESS', finalResponse, 1.0, '');
    await trace.commit(finalResponse);
    
    return this._formatReturn(
      finalResponse, text, usedRAG ? 'KnowledgeBase_RAG' : bestIntent.intent, bestIntent.confidence, 
      usedRAG ? 'Answered via Enterprise Knowledge Base' : bestIntent.reason, startTime, 
      { matchedRegex: regexMatches, matchedAliases: aliasResult.matchedAliases, toolsExecuted, traceId: trace.traceId }
    );
  }

  _formatReturn(response, normalizedText, intent, confidence, reason, startTime, extra = {}) {
    return {
      response,
      debug: { normalizedText, intent, confidence, reason, timeMs: Date.now() - startTime, ...extra }
    };
  }
}

module.exports = new AIPipelineService();