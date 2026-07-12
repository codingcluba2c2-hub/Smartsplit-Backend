const EventEmitter = require('events');

class AIEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners if we have many cache modules subscribing
    this.setMaxListeners(20);
  }

  /**
   * Triggers a specific entity invalidation.
   * Example: AIEventBus.emit('expense:updated', userId)
   */
  invalidateCache(pattern, ...args) {
    console.log(`[AIEventBus] Emitting invalidation for: ${pattern}`, args);
    this.emit(pattern, ...args);
  }

  /**
   * Broadcasts that a static rule has been updated (e.g. Greeting, Alias, FAQ).
   */
  reloadRules(ruleType) {
    console.log(`[AIEventBus] Reloading static rule: ${ruleType}`);
    this.emit(`rules:${ruleType}:updated`);
  }
}

module.exports = new AIEventBus();
