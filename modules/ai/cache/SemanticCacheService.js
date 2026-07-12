const crypto = require('crypto');
const cacheRepo = require('./CacheRepository');
const CacheMatcher = require('./CacheMatcher');
const EmbeddingEngine = require('../services/EmbeddingEngine');

class SemanticCacheService {
  
  /**
   * Generates a deterministic SHA256 cache key.
   */
  generateCacheKey(normalizedText) {
    // A simplified stop-word removal and sorting could be added here for even better exact match rates.
    // For now, we hash the normalized text.
    return crypto.createHash('sha256').update(normalizedText).digest('hex');
  }

  /**
   * Attempts to find a cached response for the query.
   */
  async checkCache(queryData) {
    const { normalizedText, intent, skipCache } = queryData;

    // 0. Cache Category Enforcement (Live Business Data Protection)
    const allowedSemanticIntents = ['Unknown', 'Knowledge', 'FAQ'];
    if (intent && !allowedSemanticIntents.includes(intent)) {
      return { hit: false, skipReason: 'Dynamic Business Data (Live DB Read)' };
    }
    
    // 1. Exact Match via Cache Key
    const cacheKey = this.generateCacheKey(normalizedText);
    const exactMatch = await cacheRepo.findByKey(cacheKey);
    
    if (exactMatch) {
      await cacheRepo.recordHit(cacheKey);
      return { hit: true, response: exactMatch.response, matchType: 'exact', score: 1.0, cacheKey };
    }

    // 2. Semantic Match via Vector Search
    try {
      const queryEmbedding = await EmbeddingEngine.generateEmbeddingForQuery(normalizedText);
      const vectorCandidates = await cacheRepo.vectorSearch(queryEmbedding, 5);
      
      if (vectorCandidates && vectorCandidates.length > 0) {
        // 3. Cache Matcher (Weighted Scoring)
        const { bestMatch, highestScore } = CacheMatcher.findBestMatch(queryData, vectorCandidates);
        
        // 4. Threshold Logic
        if (highestScore >= 0.95) {
          await cacheRepo.recordHit(bestMatch.cacheKey);
          return { hit: true, response: bestMatch.response, matchType: 'semantic_strong', score: highestScore, cacheKey: bestMatch.cacheKey };
        } else if (highestScore >= 0.90) {
          // Soft match: Check intent
          if (intent && bestMatch.intent === intent) {
            await cacheRepo.recordHit(bestMatch.cacheKey);
            return { hit: true, response: bestMatch.response, matchType: 'semantic_soft', score: highestScore, cacheKey: bestMatch.cacheKey };
          }
        }
      }
    } catch (e) {
      console.warn('[SemanticCacheService] Semantic lookup failed:', e.message);
    }
    
    return { hit: false, cacheKey };
  }

  /**
   * Saves a new entry to the Semantic Cache.
   */
  async storeResponse(queryData, responseData) {
    const { normalizedText, intent } = queryData;
    
    // 0. Cache Category Enforcement
    const allowedSemanticIntents = ['Unknown', 'Knowledge', 'FAQ'];
    if (intent && !allowedSemanticIntents.includes(intent)) {
      console.log(`[SemanticCacheService] Refusing to cache LIVE data intent: ${intent}`);
      return;
    }

    const { response, tokenUsage, chunkIds, knowledgeIds, provider, latency } = responseData;
    
    const cacheKey = this.generateCacheKey(normalizedText);
    
    // Calculate embeddings for future semantic lookup
    let questionEmbedding = [];
    try {
       questionEmbedding = await EmbeddingEngine.generateEmbeddingForQuery(normalizedText);
    } catch (e) {
      console.warn("Could not generate embedding for cache storage");
    }

    const ttlDays = 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const cacheEntry = {
      cacheKey,
      normalizedQuestion: normalizedText,
      questionEmbedding,
      intent,
      response,
      knowledgeChunkIds: chunkIds || [],
      knowledgeIds: knowledgeIds || [],
      provider: provider || 'gemini',
      tokenUsage: tokenUsage || 0,
      expiresAt,
      // We don't save latency to schema directly right now, but could be added to analytics logs
    };

    try {
      await cacheRepo.save(cacheEntry);
    } catch (e) {
      console.error('[SemanticCacheService] Failed to save cache entry', e);
    }
  }
}

module.exports = new SemanticCacheService();
