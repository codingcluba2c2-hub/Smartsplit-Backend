const express = require('express');
const router = express.Router();
const { createSettlement, getGroupSettlements, respondSettlement } = require('../controllers/settlementController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', createSettlement);
router.get('/:groupId', getGroupSettlements);
router.patch('/:id/respond', respondSettlement);

module.exports = router;
