/**
 * LongTermMemory Service
 * Simulates a vector or graph database storing facts about a user over time.
 * (e.g. "User often splits 50/50 with Alice", "User prefers concise answers")
 */
class LongTermMemory {
  constructor() {
    this.memories = new Map(); // Map<userId, Array<{ fact, timestamp, confidence }>>
  }

  async storeFact(userId, fact, confidence = 1.0) {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, []);
    }
    const userMemories = this.memories.get(userId);
    
    // Simple deduplication logic
    const exists = userMemories.find(m => m.fact.toLowerCase() === fact.toLowerCase());
    if (!exists) {
      userMemories.push({ fact, timestamp: Date.now(), confidence });
    }
  }

  async retrieveFacts(userId, query) {
    // In production, this would be a vector search against a collection like 'user_memories'.
    // For now, we return all core facts we know about the user to inject into the PromptBuilder.
    const userMemories = this.memories.get(userId) || [];
    return userMemories
      .sort((a, b) => b.confidence - a.confidence)
      .map(m => m.fact);
  }
}

module.exports = new LongTermMemory();