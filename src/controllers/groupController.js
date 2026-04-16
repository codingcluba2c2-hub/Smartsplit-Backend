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

    const populatedGroup = await group.populate('members.user', 'name email avatar');
    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name');

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
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = ensureGroupMember(group, req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized to view this group' });

    const [expenses, settlements] = await Promise.all([
      Expense.find({ groupId: group._id })
        .populate('paidBy', 'name avatar')
        .populate('splitDetails.user', 'name avatar'),
      Settlement.find({ groupId: group._id })
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
    const group = await Group.findById(req.params.id).populate('members.user', 'name email avatar');
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

    const populatedGroup = await group.populate('members.user', 'name email avatar');
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
