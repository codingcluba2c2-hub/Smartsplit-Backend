const service = require('../services/ConversationAdminService');

class ConversationAdminController {
  async getDashboard(req, res) {
    try {
      const stats = await service.getDashboard();
      res.json(stats);
    } catch (error) {
      console.error('Error in getDashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }

  async getConversations(req, res) {
    try {
      const data = await service.getConversations(req.query);
      res.json(data);
    } catch (error) {
      console.error('Error in getConversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  async getConversationDetails(req, res) {
    try {
      const data = await service.getConversationDetails(req.params.id);
      res.json(data);
    } catch (error) {
      console.error('Error in getConversationDetails:', error);
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch conversation details' });
    }
  }

  async getMessages(req, res) {
    try {
      const data = await service.getMessagesOnly(req.params.id);
      res.json(data);
    } catch (error) {
      console.error('Error in getMessages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  async deleteConversation(req, res) {
    try {
      await service.deleteConversation(req.params.id);
      res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  }

  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid input' });
      await service.bulkDelete(ids);
      res.json({ success: true, message: `${ids.length} conversations deleted` });
    } catch (error) {
      console.error('Error in bulkDelete:', error);
      res.status(500).json({ error: 'Failed to bulk delete' });
    }
  }
}

module.exports = new ConversationAdminController();