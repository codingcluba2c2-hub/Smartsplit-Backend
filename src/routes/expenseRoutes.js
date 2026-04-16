const express = require('express');
const router = express.Router();
const { addExpense, getGroupExpenses, getSettlements, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', addExpense);
router.get('/:groupId', getGroupExpenses);
router.get('/:groupId/settlements', getSettlements);
router.delete('/:id', deleteExpense);

module.exports = router;
