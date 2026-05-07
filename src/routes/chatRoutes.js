const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { getChatMessages, sendMessage, uploadMedia } = require('../controllers/chatController');

router.get('/:groupId', protect, getChatMessages);
router.post('/:groupId', protect, sendMessage);
router.post('/upload/:groupId', protect, upload.single('file'), uploadMedia);

module.exports = router;
