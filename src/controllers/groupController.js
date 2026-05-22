const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { calculateGroupSummary } = require('../services/balanceService');

const ensureGroupMember = (group, userId) => group.members.some((member) => {
  const memberId = member.user && member.user._id ? member.user._id.toString() : member.user.toString();
  return memberId === userId;
});

exports.createGroup = async (req, res) => {
  const { name, description, category, memberEmails } = req.body;

  try {
    const members = [{ user: req.user._id, role: 'admin', joinedAt: new Date() }];

    if (memberEmails && Array.isArray(memberEmails) && memberEmails.length > 0) {
      const users = await User.find({ email: { $in: memberEmails } });
      users.forEach((user) => {
        if (user._id.toString() !== req.user._id.toString()) {
          const alreadyAdded = members.some((member) => member.user.toString() === user._id.toString());
          if (!alreadyAdded) {
            members.push({ user: user._id, role: 'member', joinedAt: new Date() });
          }
        }
      });
    }

    const group = await Group.create({
      name,
      description,
      category,
      members,
      createdBy: req.user._id
    });

    const populatedGroup = await Group.populate(group, { path: 'members.user', select: 'name email avatar upiId mobile' });
    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'members.user', select: 'name email avatar upiId mobile' },
        { path: 'createdBy', select: 'name' }
      ]);

    const groupsWithSummary = await Promise.all(groups.map(async (group) => {
      const [expenses, settlements] = await Promise.all([
        Expense.find({ groupId: group._id }),
        Settlement.find({ groupId: group._id })
      ]);
      const summary = calculateGroupSummary(expenses, settlements, group);
      return { ...group.toObject(), summary };
    }));

    res.json(groupsWithSummary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate([
        { path: 'members.user', select: 'name email avatar upiId mobile' },
        { path: 'createdBy', select: 'name' }
      ]);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = ensureGroupMember(group, req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized to view this group' });

    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId: group._id })
        .populate([
          { path: 'paidBy', select: 'name avatar upiId' },
          { path: 'addedBy', select: 'name avatar upiId' },
          { path: 'participants', select: 'name avatar upiId' },
          { path: 'splitDetails.user', select: 'name avatar upiId' }
        ]),
      Settlement.find({ groupId: group._id })
        .populate([
          { path: 'payerId', select: 'name avatar email upiId' },
          { path: 'receiverId', select: 'name avatar email upiId' },
          { path: 'addedBy', select: 'name avatar email upiId' }
        ])
    ]);

    const summary = calculateGroupSummary(expenses, settlements, group);
    res.json({
      ...group.toObject(),
      summary,
      expenses,
      settlements,
      expensesCount: expenses.length,
      settlementsCount: settlements.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members.user', 'name email avatar upiId mobile');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = ensureGroupMember(group, req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized to view members' });

    res.json(group.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addMember = async (req, res) => {
  const { email } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const requester = group.members.find((member) => member.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found' });

    const alreadyMember = group.members.some((member) => member.user.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'User is already a member of this group' });

    group.members.push({ user: userToAdd._id, role: 'member', joinedAt: new Date() });
    await group.save();

    const populatedGroup = await Group.populate(group, { path: 'members.user', select: 'name email avatar upiId mobile' });
    res.json(populatedGroup.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeMember = async (req, res) => {
  const { userId } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const requester = group.members.find((member) => member.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    group.members = group.members.filter((member) => member.user.toString() !== userId);
    await group.save();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFriends = async (req, res) => {
  const { search } = req.query;
  try {
    if (search) {
      const users = await User.find({
        $and: [
          { _id: { $ne: req.user._id } },
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      }).select('name email avatar upiId mobile').limit(10);
      return res.json(users);
    }

    const fs = require('fs');
    const path = require('path');
    
    // Fallback to a dynamic path in the workspace or process.cwd(), with a fallback to /tmp on serverless
    let logFile = path.join(process.cwd(), 'friends_debug.log');
    
    const safeLog = (message) => {
      try {
        fs.appendFileSync(logFile, message);
      } catch (err) {
        // If writing failed (e.g. read-only filesystem), fallback to standard console logging
        console.log(`[friends_debug]: ${message.trim()}`);
      }
    };

    safeLog(`\n\n--- GET FRIENDS REQUEST AT ${new Date().toISOString()} ---\n`);
    safeLog(`LOGGED-IN USER: ${req.user._id} (${req.user.email})\n`);
    
    const groups = await Group.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email avatar upiId mobile');
    
    safeLog(`Fetched groups count: ${groups.length}\n`);
    const friendsMap = new Map();
    
    groups.forEach(group => {
      group.members.forEach(member => {
        const friend = member.user;
        if (friend) {
          safeLog(`Checking group member: ${friend.name} (${friend.email}), ID: ${friend._id.toString()}, Mobile: ${friend.mobile}\n`);
          if (friend._id.toString() !== req.user._id.toString()) {
            safeLog(`Adding friend: ${friend.name} (${friend.email}) to map\n`);
            friendsMap.set(friend._id.toString(), friend);
          } else {
            safeLog(`Filtering out self: ${friend.name}\n`);
          }
        }
      });
    });
    
    const friends = Array.from(friendsMap.values());
    safeLog(`Friends returned: ${JSON.stringify(friends.map(f => ({ name: f.name, email: f.email, mobile: f.mobile })))} \n`);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateGroup = async (req, res) => {
  const { name, description, category } = req.body;
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const requester = group.members.find((member) => member.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update group details' });
    }

    group.name = name || group.name;
    group.description = description || group.description;
    group.category = category || group.category;

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const requester = group.members.find((member) => member.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    // Delete associated expenses and settlements
    await Promise.all([
      Expense.deleteMany({ groupId: group._id }),
      Settlement.deleteMany({ groupId: group._id }),
      group.deleteOne()
    ]);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroupPayments = async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { payerId, category, startDate, endDate, sort, search, page = 1, limit = 10 } = req.query;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = ensureGroupMember(group, req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized to view this group' });

    const filter = { groupId: id };
    
    if (payerId) filter.paidBy = payerId;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    let sortOptions = { createdAt: -1 }; // default Newest
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    else if (sort === 'highest') sortOptions = { amount: -1 };
    else if (sort === 'lowest') sortOptions = { amount: 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total, allFilteredPayments] = await Promise.all([
      Expense.find(filter)
        .populate('paidBy', 'name email avatar')
        .populate('addedBy', 'name email avatar')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(filter),
      Expense.find(filter).select('amount createdAt')
    ]);

    // Calculate Summary
    const summary = {
      totalPaid: 0,
      totalExpensesPaid: total,
      averageExpense: 0,
      largestExpense: 0,
      recentExpense: null,
      totalReimbursed: 0,
      netBalance: 0
    };

    if (allFilteredPayments.length > 0) {
      summary.totalPaid = allFilteredPayments.reduce((sum, exp) => sum + exp.amount, 0);
      summary.averageExpense = summary.totalPaid / total;
      summary.largestExpense = Math.max(...allFilteredPayments.map(exp => exp.amount));
      
      const sortedByDate = [...allFilteredPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      summary.recentExpense = sortedByDate[0];
    }

    if (payerId) {
      const settlements = await Settlement.find({
        groupId: id,
        receiverId: payerId,
        status: { $in: ['admin_approved', 'completed'] }
      });
      summary.totalReimbursed = settlements.reduce((sum, s) => sum + s.amount, 0);
      summary.netBalance = summary.totalPaid - summary.totalReimbursed;
    }

    res.json({
      summary,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
