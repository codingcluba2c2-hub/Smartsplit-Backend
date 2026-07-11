const express = require('express');
const router = express.Router();
const multer = require('multer');
const knowledgeController = require('../controllers/KnowledgeController');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/dashboard', knowledgeController.getDashboardData);
router.get('/', knowledgeController.getDocuments);
router.post('/upload', upload.single('file'), knowledgeController.uploadDocument);
router.get('/:id', knowledgeController.getDocumentDetails);
router.delete('/:id', knowledgeController.deleteDocument);
router.post('/search-preview', knowledgeController.searchPreview);

module.exports = router;