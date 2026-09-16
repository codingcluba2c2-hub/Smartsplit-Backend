const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { 
  getChatMessages, 
  sendMessage, 
  uploadMedia,
  getDirectChatMessages,
  sendDirectMessage,
  uploadDirectMedia,
  getUnreadChatCounts,
  markDirectMessagesAsRead,
  getRecentDirectChats
} = require('../controllers/chatController');

console.log('[CHAT ROUTES] Loading and registering Direct Chat routes...');

// Recent Chats & Unread Counts Routes
router.get('/recent-chats', protect, getRecentDirectChats);
router.get('/unread-counts', protect, getUnreadChatCounts);
router.post('/direct/:recipientId/read', protect, markDirectMessagesAsRead);

// Direct User-to-User Chat Routes
router.get('/direct/:recipientId', protect, getDirectChatMessages);
router.post('/direct/upload/:recipientId', protect, upload.single('file'), uploadDirectMedia);
router.post('/direct/:recipientId', protect, sendDirectMessage);

// Group Chat Routes
router.get('/:groupId', protect, getChatMessages);
router.post('/:groupId', protect, sendMessage);
router.post('/upload/:groupId', protect, upload.single('file'), uploadMedia);

module.exports = router;
