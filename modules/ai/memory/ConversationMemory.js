const ConversationHistory = require('../../models/ConversationHistory');

class ConversationMemory {
  async addMessage(conversationId, role, content) {
    // In production: await ConversationHistory.create({ conversationId, role, content })
    console.log(`[Memory] Logged ${role} message to conversation ${conversationId}`);
  }
  
  async getRecentHistory(conversationId, limit = 10) {
    // In production: fetch from DB
    return [];
  }
}
module.exports = new ConversationMemory();