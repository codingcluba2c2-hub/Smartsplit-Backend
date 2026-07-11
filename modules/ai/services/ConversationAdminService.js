const repository = require('../repositories/ConversationAdminRepository');

class ConversationAdminService {
  async getDashboard() {
    const stats = await repository.getDashboardStats();
    return stats;
  }

  async getConversations(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    
    // Sort parsing
    let sortObj = { createdAt: -1 };
    if (query.sortField) {
      sortObj = { [query.sortField]: query.sortOrder === 'asc' ? 1 : -1 };
    }

    const { items, total } = await repository.getPaginatedConversations(query, page, limit, sortObj);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1
      }
    };
  }

  async getConversationDetails(id) {
    const overview = await repository.getConversationById(id);
    if (!overview) throw new Error('Conversation not found');
    
    const messages = await repository.getConversationMessages(id);
    return { overview, messages };
  }

  async getMessagesOnly(id) {
    return await repository.getConversationMessages(id);
  }

  async deleteConversation(id) {
    return await repository.softDeleteConversation(id);
  }

  async bulkDelete(ids) {
    return await repository.bulkSoftDeleteConversations(ids);
  }
}

module.exports = new ConversationAdminService();