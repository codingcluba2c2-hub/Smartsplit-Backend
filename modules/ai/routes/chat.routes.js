const express = require('express');
const router = express.Router();
const chatController = require('../controllers/ChatController');
const historyController = require('../controllers/historyController');

const { protect } = require('../../../src/middlewares/authMiddleware');


router.post('/chat', protect, chatController.chat);
router.post('/stream', protect, chatController.stream);

// Conversation History Routes
router.get('/conversations', protect, historyController.getConversations);
router.post('/conversations', protect, historyController.createConversation);
router.put('/conversations/:id', protect, historyController.updateConversation);
router.delete('/conversations/:id', protect, historyController.deleteConversation);
router.get('/conversations/:id/history', protect, historyController.getConversationHistory);
router.post('/conversations/message', protect, historyController.postMessage);

module.exports = router;