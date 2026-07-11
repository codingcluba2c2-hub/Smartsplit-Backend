const express = require('express');
const router = express.Router();
const controller = require('../controllers/ConversationAdminController');

router.get('/dashboard', controller.getDashboard);
router.get('/', controller.getConversations);
router.delete('/bulk', controller.bulkDelete);
router.get('/:id', controller.getConversationDetails);
router.get('/:id/messages', controller.getMessages);
router.delete('/:id', controller.deleteConversation);

module.exports = router;