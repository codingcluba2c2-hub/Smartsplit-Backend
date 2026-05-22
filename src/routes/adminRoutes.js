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
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);
router.patch('/users/:id/update-upi', adminController.updateUserUpi);
router.delete('/users/:id', adminController.deleteUser);

// Group Management
router.get('/groups', adminController.getAllGroups);
router.get('/groups/:id', adminController.getGroupById);
router.delete('/groups/:id', adminController.deleteGroup);

// Expense Monitoring
router.get('/expenses', adminController.getAllExpenses);

// Settlement Monitoring
router.get('/settlements', adminController.getAllSettlements);
router.patch('/settlements/:id/force-complete', adminController.forceCompleteSettlement);
router.patch('/settlements/:id/reject', adminController.rejectSettlement);
router.patch('/settlements/:id/flag', adminController.flagSettlement);
router.delete('/settlements/:id', adminController.deleteSettlement);

// Report/Dispute System
router.get('/reports', adminController.getAllReports);
router.patch('/reports/:id/resolve', adminController.resolveReport);

// Activity Logs
router.get('/login-logs', adminController.getLoginLogs);
router.get('/activity-logs', adminController.getAdminActivityLogs);

// Notifications System
router.get('/notifications', adminController.getAllNotifications);
router.patch('/notifications/read-all', adminController.markAllNotificationsAsRead);
router.patch('/notifications/:id/read', adminController.markNotificationAsRead);
router.delete('/notifications/:id', adminController.deleteNotification);

module.exports = router;