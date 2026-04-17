const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { calculateSettlements } = require('../services/settlementService');

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

exports.addExpense = async (req, res) => {
  const { groupId, description, amount, splitType, splitDetails, category } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group members can add expenses' });
    }

    if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
      return res.status(400).json({ message: 'Expense participants are required' });
    }

    const participantIds = splitDetails.map((split) => split.user.toString());
    if (!validateMembers(group, participantIds)) {
      return res.status(400).json({ message: 'All split participants must be group members' });
    }

    const amountTotal = splitDetails.reduce((sum, split) => sum + Number(split.amount), 0);
    if (Math.abs(amountTotal - Number(amount)) > 0.01) {
      return res.status(400).json({ message: 'Split totals must equal expense amount' });
    }

    const expense = await Expense.create({
      groupId,
      description,
      amount,
      paidBy: req.user._id,
      splitType,
      splitDetails,
      category
    });

    await expense.populate([
      { path: 'paidBy', select: 'name avatar' },
      { path: 'splitDetails.user', select: 'name avatar' }
    ]);

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
      .populate('paidBy', 'name avatar')
      .populate('splitDetails.user', 'name avatar')
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

    const expenses = await Expense.find({ groupId: req.params.groupId });

    const transactions = calculateSettlements(expenses, group.members);
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
