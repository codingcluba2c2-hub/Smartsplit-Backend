const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { calculateSettlements } = require('../services/settlementService');
const { getExpenseShares, fromCents, toCents } = require('../services/balanceService');
const { uploadToCloudinary } = require('../services/cloudinaryService');

const getMemberId = (member) => {
  if (!member.user) return null;
  return member.user._id ? member.user._id.toString() : member.user.toString();
};

const validateMembers = (group, memberIds) => {
  const memberSet = new Set(group.members.map((member) => getMemberId(member)));
  return memberIds.every((id) => memberSet.has(id.toString()));
};

const isGroupMember = (group, userId) => {
  const normalizedId = userId.toString();
  return group.members.some((member) => getMemberId(member) === normalizedId);
};

const normalizeUniqueIds = (values = []) => [...new Set(values.map((value) => value?.toString()).filter(Boolean))];

exports.addExpense = async (req, res) => {
  console.log('Received addExpense request:', req.body);
  const { groupId, description, amount, splitType = 'equal', splitDetails = [], participants = [], category, paidBy, receipt } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group members can add expenses' });
    }

    const participantIds = normalizeUniqueIds(participants.length > 0 ? participants : splitDetails.map((split) => split.user));
    if (participantIds.length === 0) {
      return res.status(400).json({ message: 'Expense participants are required' });
    }

    if (!validateMembers(group, participantIds)) {
      return res.status(400).json({ message: 'All participants must be group members' });
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    if (splitType === 'unequal') {
      if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
        return res.status(400).json({ message: 'Custom split details are required for unequal expenses' });
      }

      const detailParticipantIds = normalizeUniqueIds(splitDetails.map((split) => split.user));
      if (detailParticipantIds.length !== participantIds.length || !detailParticipantIds.every((userId) => participantIds.includes(userId))) {
        return res.status(400).json({ message: 'Participants must match the custom split users' });
      }

      const amountTotalCents = splitDetails.reduce((sum, split) => sum + toCents(split.amount), 0);
      if (amountTotalCents !== toCents(parsedAmount)) {
        return res.status(400).json({ message: 'Split totals must equal expense amount' });
      }
    }

    let finalPaidBy = req.user._id;
    if (paidBy) {
      if (!isGroupMember(group, paidBy)) {
        return res.status(400).json({ message: 'The user who paid must be a group member' });
      }
      finalPaidBy = paidBy;
    }

    let receiptURL = '';
    if (receipt) {
      try {
        receiptURL = await uploadToCloudinary(receipt, 'smartsplit_receipts');
      } catch (uploadError) {
        return res.status(400).json({ message: 'Failed to upload receipt image' });
      }
    }

    const expense = await Expense.create({
      groupId,
      description,
      amount: parsedAmount,
      paidBy: finalPaidBy,
      addedBy: req.user._id,
      participants: participantIds,
      splitType,
      splitDetails,
      category,
      receipt: receiptURL
    });

    try {
      await Expense.populate(expense, [
        { path: 'paidBy', select: 'name avatar' },
        { path: 'addedBy', select: 'name avatar' },
        { path: 'participants', select: 'name avatar' },
        { path: 'splitDetails.user', select: 'name avatar' }
      ]);
    } catch (populateError) {
      console.error('Expense population failed:', populateError);
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroupExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view expenses' });
    }

    const expenses = await Expense.find({ groupId: req.params.groupId })
      .populate([
        { path: 'paidBy', select: 'name avatar' },
        { path: 'addedBy', select: 'name avatar' },
        { path: 'participants', select: 'name avatar' },
        { path: 'splitDetails.user', select: 'name avatar' }
      ])
      .sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members.user', 'name avatar');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some((member) => member.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized to view settlements' });

    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId: req.params.groupId }),
      require('../models/Settlement').find({ groupId: req.params.groupId })
    ]);

    const transactions = calculateSettlements(expenses, group.members, settlements);
    const populatedTransactions = transactions.map((t) => ({
      ...t,
      fromUser: group.members.find((m) => m.user._id.toString() === t.from).user,
      toUser: group.members.find((m) => m.user._id.toString() === t.to).user
    }));

    res.json(populatedTransactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const group = await Group.findById(expense.groupId);
    const requester = group.members.find((member) => getMemberId(member) === req.user._id.toString());

    if (expense.paidBy.toString() !== req.user._id.toString() && (!requester || requester.role !== 'admin')) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
