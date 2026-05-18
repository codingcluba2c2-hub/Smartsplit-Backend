const express = require('express');
const router = express.Router();
const { 
  addExpense, 
  getGroupExpenses, 
  getSettlements, 
  deleteExpense, 
  updateExpense, 
  getExpenseEditHistory,
  getGroupExpenseEditHistory
} = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', addExpense);
router.get('/:groupId', getGroupExpenses);
router.get('/:groupId/settlements', getSettlements);
router.delete('/:id', deleteExpense);
router.put('/:id', updateExpense);
router.get('/:id/history', getExpenseEditHistory);
router.get('/group/:groupId/history', getGroupExpenseEditHistory);

module.exports = router;
