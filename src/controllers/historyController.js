const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

exports.getHistory = async (req, res) => {
  const { groupId, userId, startDate, endDate } = req.query;
  try {
    const groups = await Group.find({ 'members.user': req.user._id }).select('_id');
    const groupIds = groups.map((group) => group._id.toString());

    if (groupId && !groupIds.includes(groupId)) {
      return res.status(403).json({ message: 'Not authorized to view this history' });
    }

    const filterGroup = groupId ? { groupId } : { groupId: { $in: groupIds } };
    const expenseQuery = { ...filterGroup };
    const settlementQuery = { ...filterGroup };

    if (userId) {
      expenseQuery.$or = [
        { paidBy: userId },
        { 'splitDetails.user': userId }
      ];
      settlementQuery.$or = [
        { payerId: userId },
        { receiverId: userId }
      ];
    }

    if (startDate || endDate) {
      expenseQuery.createdAt = {};
      settlementQuery.createdAt = {};
      if (startDate) expenseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) expenseQuery.createdAt.$lte = new Date(endDate);
      if (startDate) settlementQuery.createdAt.$gte = new Date(startDate);
      if (endDate) settlementQuery.createdAt.$lte = new Date(endDate);
    }

    const [expenses, settlements] = await Promise.all([
      Expense.find(expenseQuery)
        .populate([
          { path: 'paidBy', select: 'name avatar' },
          { path: 'groupId', select: 'name' },
          { path: 'participants', select: 'name avatar' },
          { path: 'splitDetails.user', select: 'name avatar' }
        ])
        .sort({ createdAt: -1 }),
      Settlement.find(settlementQuery)
        .populate([
          { path: 'payerId', select: 'name avatar' },
          { path: 'receiverId', select: 'name avatar' },
          { path: 'groupId', select: 'name' }
        ])
        .sort({ createdAt: -1 })
    ]);

    const history = [
      ...expenses.map((expense) => ({
        type: 'expense',
        id: expense._id,
        group: expense.groupId,
        createdAt: expense.createdAt,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        splitDetails: expense.splitDetails
      })),
      ...settlements.map((settlement) => ({
        type: 'settlement',
        id: settlement._id,
        group: settlement.groupId,
        createdAt: settlement.createdAt,
        amount: settlement.amount,
        payer: settlement.payerId,
        receiver: settlement.receiverId,
        paymentType: settlement.paymentType,
        status: settlement.status,
        screenshot: settlement.screenshot,
        note: settlement.note
      }))
    ].sort((a, b) => b.createdAt - a.createdAt);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
