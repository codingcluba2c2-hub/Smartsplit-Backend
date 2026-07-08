const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const appOwnerMiddleware = require('../middlewares/appOwnerMiddleware');
const databaseExplorerController = require('../controllers/databaseExplorerController');

// All routes are protected by auth and appOwnerMiddleware
router.use(protect, appOwnerMiddleware);

router.get('/dashboard-stats', databaseExplorerController.getDashboardStats);
router.get('/collections', databaseExplorerController.getCollections);
router.get('/collections/:modelName', databaseExplorerController.getDocuments);
router.get('/collections/:modelName/:id', databaseExplorerController.getDocument);
router.put('/collections/:modelName/:id', databaseExplorerController.updateDocument);
router.delete('/collections/:modelName/:id', databaseExplorerController.deleteDocument);
router.post('/collections/:modelName/restore/:id', databaseExplorerController.restoreDocument);

module.exports = router;
