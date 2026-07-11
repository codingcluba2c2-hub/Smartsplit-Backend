const express = require('express');
const router = express.Router();
const greetingsController = require('../controllers/adminGreetingsController');
const fallbacksController = require('../controllers/adminFallbacksController');
const historyController = require('../controllers/historyController');

// Assume an admin authentication middleware exists. We can mock or omit it if not strictly defined.
// const { protect, admin } = require('../../auth/middleware');

// Dashboard
router.get('/greetings/dashboard', greetingsController.getDashboardStats);

// Greetings CRUD
router.get('/greetings', greetingsController.getGreetings);
router.post('/greetings', greetingsController.createGreeting);
router.put('/greetings/:id', greetingsController.updateGreeting);
router.delete('/greetings/:id', greetingsController.deleteGreeting);
router.patch('/greetings/:id/status', greetingsController.toggleGreetingStatus);
router.post('/greetings/:id/clone', greetingsController.cloneGreeting);
router.post('/greetings/test', greetingsController.testGreeting);

// Fallbacks CRUD
router.get('/fallbacks', fallbacksController.getFallbacks);
router.post('/fallbacks', fallbacksController.createFallback);
router.put('/fallbacks/:id', fallbacksController.updateFallback);
router.delete('/fallbacks/:id', fallbacksController.deleteFallback);
router.patch('/fallbacks/:id/status', fallbacksController.toggleFallbackStatus);

module.exports = router;


