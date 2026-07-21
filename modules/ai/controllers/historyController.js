const Conversations = require('../models/Conversations');
const ConversationHistory = require('../models/ConversationHistory');
const AIPipelineService = require('../services/AIPipelineService');

class HistoryController {

  
  async getConversations(req, res) {
    try {
      const userId = req.user ? req.user._id : 'anonymous';
      const conversations = await Conversations.find({ userId, isDeleted: false })
        .sort({ updatedAt: -1 });
      
      res.json({ data: conversations });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createConversation(req, res) {
    try {
      const userId = req.user ? req.user._id : 'anonymous';
      const { title } = req.body;

      const conversation = await Conversations.create({
        userId,
        title: title || 'New Conversation',
        createdBy: userId === 'anonymous' ? null : userId,
      });

      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateConversation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user._id : 'anonymous';
      const { title } = req.body;

      const conversation = await Conversations.findOneAndUpdate(
        { _id: id, userId, isDeleted: false },
        { title, updatedBy: userId === 'anonymous' ? null : userId },
        { new: true }
      );

      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user._id : 'anonymous';

      const conversation = await Conversations.findOneAndUpdate(
        { _id: id, userId },
        { isDeleted: true, deletedAt: new Date(), updatedBy: userId === 'anonymous' ? null : userId },
        { new: true }
      );

      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getConversationHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user._id : 'anonymous';

      const conversation = await Conversations.findOne({ _id: id, userId, isDeleted: false });
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      const history = await ConversationHistory.find({ conversationId: id, isDeleted: false })
        .sort({ createdAt: 1 });

      res.json({ data: history });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async postMessage(req, res) {
    try {
      const userId = req.user ? req.user._id : 'anonymous';
      const { message, conversationId } = req.body;
      if (!message) return res.status(400).json({ error: 'Message text is required' });

      let activeConvId = conversationId;

      if (!activeConvId) {
        const conv = await Conversations.create({
          userId,
          title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
          createdBy: userId === 'anonymous' ? null : userId,
        });
        activeConvId = conv._id;
      }

      const userMessage = await ConversationHistory.create({
        conversationId: activeConvId,
        role: 'user',
        content: message,
        createdBy: userId === 'anonymous' ? null : userId,
      });

      let aiResult;
      try {
        aiResult = await AIPipelineService.processMessage(userId, activeConvId.toString(), message);
      } catch (e) {
        console.error("Pipeline failed:", e);
        aiResult = { response: "I encountered an error processing your request." };
      }

      const actualResponse = aiResult.response;

      let assistantMessage = null;
      if (aiResult.type !== 'action') {
        assistantMessage = await ConversationHistory.create({
          conversationId: activeConvId,
          role: 'assistant',
          content: actualResponse,
          createdBy: userId === 'anonymous' ? null : userId,
        });
      }

      res.json({
        conversationId: activeConvId,
        userMessage,
        assistantMessage,
        aiResult
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
}


module.exports = new HistoryController();
