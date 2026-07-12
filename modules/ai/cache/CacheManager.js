const SemanticCacheRepository = require('./CacheRepository');
const ContextManager = require('../memory/ContextManager');
const intentService = require('../intent/IntentService');
const regexService = require('../regex/RegexService');
const aliasService = require('../aliases/AliasService');
const AIEventBus = require('../events/AIEventBus');

class CacheManager {
  /**
   * Clears all caches across the system.
   */
  async clearAll() {
    await this.clearSemantic();
    this.clearConversation();
    this.clearIntentCache();
    this.clearRegexCache();
    this.clearAliasCache();
  }

  async clearSemantic() {
    await SemanticCacheRepository.clearAll();
  }

  clearConversation() {
    ContextManager.clearConversation();
  }

  clearIntentCache() {
    AIEventBus.reloadRules('intent');
  }

  clearRegexCache() {
    AIEventBus.reloadRules('regex');
  }

  clearAliasCache() {
    AIEventBus.reloadRules('alias');
  }

  async invalidatePattern(pattern) {
    // In a Redis implementation, we would SCAN and DEL keys matching the pattern.
    // For MongoDB semantic cache, we might delete by tags.
    // For now, this is a stub for the architecture.
    console.log(`[CacheManager] Invalidated pattern: ${pattern}`);
  }

  getVersions() {
    return {
      intent: intentService.getVersion ? intentService.getVersion() : 'v1',
      regex: regexService.getVersion ? regexService.getVersion() : 'v1',
      alias: aliasService.getVersion ? aliasService.getVersion() : 'v1'
    };
  }

  async getStatus() {
    const semanticStats = await SemanticCacheRepository.getStats();
    
    return {
      versions: this.getVersions(),
      semanticCache: {
        entries: semanticStats.count,
        memoryUsage: 'N/A (DB)',
        hitRatio: 'N/A', // Would require analytics table
      },
      conversationMemory: {
        entries: Object.keys(ContextManager.sessions).length,
        memoryUsage: 'In-Memory',
      }
    };
  }
}

module.exports = new CacheManager();
