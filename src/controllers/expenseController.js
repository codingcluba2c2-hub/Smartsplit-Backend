const Expense = require('../models/Expense');
const Group = require('../models/Group');
const ExpenseEditHistory = require('../models/ExpenseEditHistory');
const User = require('../models/User');
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
  const { groupId, description, amount, splitType = 'equal', splitDetails = [], participants = [], category, paidBy, receipt, paymentMethod } = req.body;

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
      receipt: receiptURL,
      paymentMethod: paymentMethod || 'UPI'
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

    // Also delete any edit history associated with this expense
    await ExpenseEditHistory.deleteMany({ expenseId: expense._id });

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  console.log('Received updateExpense request for ID:', req.params.id, req.body);
  const { description, amount, splitType = 'equal', splitDetails = [], participants = [], category, paidBy, receipt, paymentMethod, date } = req.body;

  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const group = await Group.findById(expense.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // 1. Edit Permission Rules:
    // Only the user who created (added) the expense can edit it.
    // Admin/group admin may also edit (optional, but implement as a configurable option).
    const ALLOW_ADMIN_EDIT = true; // Configurable option

    const isCreator = expense.addedBy.toString() === req.user._id.toString();
    const requesterMember = group.members.find((member) => getMemberId(member) === req.user._id.toString());
    const isGroupAdmin = requesterMember && requesterMember.role === 'admin';
    const isSystemAdmin = req.user.role === 'admin';

    const canEdit = isCreator || (ALLOW_ADMIN_EDIT && (isGroupAdmin || isSystemAdmin));

    if (!canEdit) {
      return res.status(403).json({ message: 'Only the user who added this expense (or group/system admins) can edit it' });
    }

    // 2. Validate participants & split details:
    const participantIds = normalizeUniqueIds(participants.length > 0 ? participants : splitDetails.map((split) => split.user));
    if (participantIds.length === 0) {
      return res.status(400).json({ message: 'Expense participants are required' });
    }

    if (!validateMembers(group, participantIds)) {
      return res.status(400).json({ message: 'All participants must be group members' });
    }

    const parsedAmount = Number(amount);
    if (amount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
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

      const targetAmount = amount !== undefined ? parsedAmount : expense.amount;
      const amountTotalCents = splitDetails.reduce((sum, split) => sum + toCents(split.amount), 0);
      if (amountTotalCents !== toCents(targetAmount)) {
        return res.status(400).json({ message: 'Split totals must equal expense amount' });
      }
    }

    if (paidBy) {
      if (!isGroupMember(group, paidBy)) {
        return res.status(400).json({ message: 'The user who paid must be a group member' });
      }
    }

    // 3. Track History & Apply Changes:
    const changes = [];

    // Helper to get split string representation
    const getSplitString = async (splits) => {
      const populatedSplits = [];
      for (const split of splits) {
        const uId = split.user?._id || split.user;
        const u = await User.findById(uId);
        populatedSplits.push(`${u ? u.name : 'Unknown'}: ₹${Number(split.amount).toFixed(2)}`);
      }
      return populatedSplits.join(', ');
    };

    // Description change
    if (description !== undefined && description !== expense.description) {
      changes.push({
        field: 'description',
        oldValue: expense.description,
        newValue: description
      });
      expense.description = description;
    }

    // Amount change
    if (amount !== undefined && parsedAmount !== expense.amount) {
      changes.push({
        field: 'amount',
        oldValue: `₹${expense.amount.toFixed(2)}`,
        newValue: `₹${parsedAmount.toFixed(2)}`
      });
      expense.amount = parsedAmount;
    }

    // Date change
    if (date !== undefined) {
      const oldTime = new Date(expense.date).getTime();
      const newTime = new Date(date).getTime();
      if (oldTime !== newTime) {
        changes.push({
          field: 'date',
          oldValue: expense.date.toISOString().split('T')[0],
          newValue: new Date(date).toISOString().split('T')[0]
        });
        expense.date = new Date(date);
      }
    }

    // Category change
    if (category !== undefined && category !== expense.category) {
      changes.push({
        field: 'category',
        oldValue: expense.category,
        newValue: category
      });
      expense.category = category;
    }

    // PaymentMethod change
    if (paymentMethod !== undefined && paymentMethod !== expense.paymentMethod) {
      changes.push({
        field: 'paymentMethod',
        oldValue: expense.paymentMethod,
        newValue: paymentMethod
      });
      expense.paymentMethod = paymentMethod;
    }

    // PaidBy change
    if (paidBy !== undefined && paidBy.toString() !== expense.paidBy.toString()) {
      const oldPaidByUser = await User.findById(expense.paidBy);
      const newPaidByUser = await User.findById(paidBy);
      changes.push({
        field: 'paidBy',
        oldValue: oldPaidByUser ? oldPaidByUser.name : 'Unknown',
        newValue: newPaidByUser ? newPaidByUser.name : 'Unknown'
      });
      expense.paidBy = paidBy;
    }

    // Receipt change
    if (receipt !== undefined) {
      let receiptURL = expense.receipt;
      if (receipt && receipt.startsWith('data:')) {
        try {
          receiptURL = await uploadToCloudinary(receipt, 'smartsplit_receipts');
        } catch (uploadError) {
          return res.status(400).json({ message: 'Failed to upload receipt image' });
        }
      } else {
        receiptURL = receipt || '';
      }

      if (receiptURL !== expense.receipt) {
        changes.push({
          field: 'receipt',
          oldValue: expense.receipt ? 'Proof attached' : 'No proof',
          newValue: receiptURL ? 'New proof attached' : 'No proof'
        });
        expense.receipt = receiptURL;
      }
    }

    // SplitType change
    if (splitType !== undefined && splitType !== expense.splitType) {
      changes.push({
        field: 'splitType',
        oldValue: expense.splitType,
        newValue: splitType
      });
      expense.splitType = splitType;
    }

    // Participants change
    const oldParts = expense.participants.map((p) => p.toString()).sort();
    const newParts = participantIds.map((p) => p.toString()).sort();
    if (JSON.stringify(oldParts) !== JSON.stringify(newParts)) {
      const oldUsers = await User.find({ _id: { $in: expense.participants } });
      const newUsers = await User.find({ _id: { $in: participantIds } });
      changes.push({
        field: 'participants',
        oldValue: oldUsers.map((u) => u.name).join(', '),
        newValue: newUsers.map((u) => u.name).join(', ')
      });
      expense.participants = participantIds;
    }

    // SplitDetails change
    let splitDetailsChanged = false;
    if (expense.splitDetails.length !== splitDetails.length) {
      splitDetailsChanged = true;
    } else {
      for (const newSplit of splitDetails) {
        const matchingOld = expense.splitDetails.find(
          (oldSplit) => (oldSplit.user?._id || oldSplit.user).toString() === (newSplit.user?._id || newSplit.user).toString()
        );
        if (!matchingOld || Number(matchingOld.amount) !== Number(newSplit.amount)) {
          splitDetailsChanged = true;
          break;
        }
      }
    }

    if (splitDetailsChanged) {
      const oldStr = await getSplitString(expense.splitDetails);
      const newStr = await getSplitString(splitDetails);
      changes.push({
        field: 'splitDetails',
        oldValue: oldStr,
        newValue: newStr
      });
      expense.splitDetails = splitDetails;
    }

    // Only save and record if there actually are changes!
    if (changes.length > 0) {
      await expense.save();

      // Create history record
      await ExpenseEditHistory.create({
        expenseId: expense._id,
        groupId: expense.groupId,
        editedBy: req.user._id,
        changes
      });
    }

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

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExpenseEditHistory = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const group = await Group.findById(expense.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this expense edit history' });
    }

    const history = await ExpenseEditHistory.find({ expenseId: req.params.id })
      .populate('editedBy', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroupExpenseEditHistory = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view group edit history' });
    }

    const history = await ExpenseEditHistory.find({ groupId: req.params.groupId })
      .populate('editedBy', 'name avatar')
      .populate('expenseId', 'description')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
