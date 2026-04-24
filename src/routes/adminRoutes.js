const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminMiddleware);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/block', adminController.blockUser);

// Group Management
router.get('/groups', adminController.getAllGroups);
router.get('/groups/:id', adminController.getGroupById);
router.delete('/groups/:id', adminController.deleteGroup);

// Expense Monitoring
router.get('/expenses', adminController.getAllExpenses);

// Settlement Monitoring
router.get('/settlements', adminController.getAllSettlements);
router.patch('/settlements/:id/flag', adminController.flagSettlement);
router.delete('/settlements/:id', adminController.deleteSettlement);

// Report/Dispute System
router.get('/reports', adminController.getAllReports);
router.patch('/reports/:id/resolve', adminController.resolveReport);

module.exports = router;