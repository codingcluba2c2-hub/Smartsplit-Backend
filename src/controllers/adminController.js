const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Report = require('../models/Report');
const LoginLog = require('../models/LoginLog');
const AdminActivityLog = require('../models/AdminActivityLog');
const Notification = require('../models/Notification');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();
    const totalExpenses = await Expense.countDocuments();
    const totalSettlements = await Settlement.countDocuments();

    const currentDate = new Date();
    const stats = [];

    // Get stats for last 6 months specifically as requested
    for (let i = 5; i >= 0; i--) {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

      const [newUsers, newGroups, monthExpenses] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Group.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Expense.find({ createdAt: { $gte: start, $lt: end } }).select('amount')
      ]);

      const totalAmount = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      stats.push({
        month: start.toLocaleString('default', { month: 'short' }),
        newUsers,
        newGroups,
        expenseCount: monthExpenses.length,
        totalAmount
      });
    }

    res.json({
      totalUsers,
      totalGroups,
      totalExpenses,
      totalSettlements,
      monthlyStats: stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'blocked') {
      filter.isBlocked = true;
    } else if (status === 'active') {
      filter.isBlocked = { $ne: true };
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = isBlocked;
    user.status = isBlocked ? 'suspended' : 'active';
    await user.save();

    // Log the admin action
    await AdminActivityLog.create({
      adminId: req.user._id,
      action: isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetId: user._id,
      targetModel: 'User',
      details: { username: user.name, email: user.email }
    });

    if (isBlocked) {
      await Notification.create({
        title: 'Account Blocked',
        message: 'Your account has been blocked.',
        type: 'alert',
        targetId: user._id,
        targetModel: 'User',
        recipientRole: 'user',
        recipientId: user._id
      });
    }

    res.json({ message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = false;
    user.status = 'active';
    await user.save();

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'UNBLOCK_USER',
      targetId: user._id,
      targetModel: 'User',
      details: { username: user.name, email: user.email }
    });

    res.json({ message: 'User unblocked successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateUserUpi = async (req, res) => {
  try {
    const { id } = req.params;
    const { upiId } = req.body;
    
    if (!upiId || upiId.trim() === '') {
       return res.status(400).json({ message: 'UPI ID is required' });
    }
    
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(upiId)) {
       return res.status(400).json({ message: 'Invalid UPI ID format' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.upiId = upiId;
    await user.save();

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'EDIT_UPI',
      targetId: user._id,
      targetModel: 'User',
      details: { username: user.name, newUpi: upiId }
    });

    await Notification.create({
      title: 'UPI ID Updated',
      message: 'Your payment UPI was updated by Admin.',
      type: 'info',
      targetId: user._id,
      targetModel: 'User',
      recipientRole: 'user',
      recipientId: user._id
    });

    res.json({ message: 'UPI Updated Successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    user.status = 'suspended';
    await user.save();

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'DELETE_USER',
      targetId: user._id,
      targetModel: 'User',
      details: { username: user.name, email: user.email }
    });

    res.json({ message: 'User account deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Group Management
exports.getAllGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const groups = await Group.find(filter)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Group.countDocuments(filter);

    res.json({
      groups,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllGroups:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Delete related expenses and settlements
    await Expense.deleteMany({ groupId: id });
    await Settlement.deleteMany({ groupId: id });

    await Group.findByIdAndDelete(id);

    // Log the admin action
    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'DELETE_GROUP',
      targetId: group._id,
      targetModel: 'Group',
      details: { name: group.name }
    });

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Admin fetching group details for ID:', id);

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const group = await Group.findById(id)
      .populate('createdBy', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!group) {
      console.log('Group not found for ID:', id);
      return res.status(404).json({ message: 'Group not found in database' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Error in getGroupById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Expense Monitoring
exports.getAllExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, groupId, userId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (groupId) filter.groupId = groupId;
    if (userId) filter.paidBy = userId;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const expenses = await Expense.find(filter)
      .populate('groupId', 'name')
      .populate('paidBy', 'name email avatar')
      .populate('splitDetails.user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(filter);

    res.json({
      expenses,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllExpenses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Settlement Monitoring
exports.getAllSettlements = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all', groupId } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status !== 'all') filter.status = status;
    if (groupId) filter.groupId = groupId;

    const settlements = await Settlement.find(filter)
      .populate('groupId', 'name')
      .populate('payerId', 'name email avatar')
      .populate('receiverId', 'name email avatar')
      .populate('addedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Settlement.countDocuments(filter);

    res.json({
      settlements,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllSettlements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.forceCompleteSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { ownerCompletionReason } = req.body;

    const settlement = await Settlement.findById(id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    if (settlement.status !== 'pending' && settlement.status !== 'disputed') {
      return res.status(400).json({ message: 'Only pending or disputed settlements can be force completed' });
    }

    settlement.status = 'completed';
    settlement.completedByOwner = true;
    settlement.completedBy = req.user._id;
    settlement.completedAt = new Date();
    if (ownerCompletionReason) {
      settlement.ownerCompletionReason = ownerCompletionReason;
    }
    
    // Maintain old fields for backward compatibility if needed, but primary is completedByOwner
    settlement.adminApproved = true;
    settlement.adminApprovedBy = req.user._id;
    settlement.adminApprovedAt = new Date();
    
    await settlement.save();

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'OWNER_FORCE_COMPLETED_SETTLEMENT',
      targetId: settlement._id,
      targetModel: 'Settlement',
      details: { amount: settlement.amount, status: settlement.status, reason: ownerCompletionReason }
    });

    // Notify Sender
    await Notification.create({
      title: 'Settlement Force Completed',
      message: 'Your settlement has been completed by the App Owner after payment verification.',
      type: 'success',
      targetId: settlement._id,
      targetModel: 'Settlement',
      recipientRole: 'user',
      recipientId: settlement.payerId
    });

    // Notify Receiver
    await Notification.create({
      title: 'Settlement Force Completed',
      message: 'This settlement has been completed by the App Owner after payment verification.',
      type: 'info',
      targetId: settlement._id,
      targetModel: 'Settlement',
      recipientRole: 'user',
      recipientId: settlement.receiverId
    });

    res.json({ message: 'Settlement force completed successfully', settlement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.rejectSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const settlement = await Settlement.findById(id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    settlement.status = 'rejected';
    settlement.rejectionReason = rejectionReason || 'Rejected by admin without reason';
    await settlement.save();

    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'REJECT_SETTLEMENT',
      targetId: settlement._id,
      targetModel: 'Settlement',
      details: { amount: settlement.amount, reason: settlement.rejectionReason }
    });

    await Notification.create({
      title: 'Settlement Rejected',
      message: `Your settlement was rejected. Reason: ${settlement.rejectionReason}`,
      type: 'alert',
      targetId: settlement._id,
      targetModel: 'Settlement',
      recipientRole: 'user',
      recipientId: settlement.addedBy
    });

    res.json({ message: 'Settlement rejected successfully', settlement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.flagSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { flagged, reason } = req.body;

    const settlement = await Settlement.findByIdAndUpdate(id, {
      isFlagged: flagged,
      flagReason: reason
    }, { new: true });

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    // Log the admin action
    await AdminActivityLog.create({
      adminId: req.user._id,
      action: flagged ? 'FLAG_SETTLEMENT' : 'UNFLAG_SETTLEMENT',
      targetId: settlement._id,
      targetModel: 'Settlement',
      details: { reason }
    });

    res.json({ message: `Settlement ${flagged ? 'flagged' : 'unflagged'} successfully`, settlement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const settlement = await Settlement.findByIdAndDelete(id);

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    // Log the admin action
    await AdminActivityLog.create({
      adminId: req.user._id,
      action: 'DELETE_SETTLEMENT',
      targetId: settlement._id,
      targetModel: 'Settlement',
      details: { amount: settlement.amount }
    });

    res.json({ message: 'Settlement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Report/Dispute System
exports.getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status !== 'all') filter.status = status;

    const reports = await Report.find(filter)
      .populate('reportedBy', 'name email avatar')
      .populate('resolvedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(filter);

    res.json({
      reports,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllReports:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const report = await Report.findByIdAndUpdate(id, {
      status,
      adminNote,
      resolvedBy: req.user.id,
      resolvedAt: new Date()
    }, { new: true });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Log the admin action
    await AdminActivityLog.create({
      adminId: req.user.id,
      action: 'RESOLVE_REPORT',
      targetId: report._id,
      targetModel: 'Report',
      details: { status, adminNote }
    });

    res.json({ message: 'Report resolved successfully', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login Activity Logs
exports.getLoginLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, email = '' } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    const logs = await LoginLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LoginLog.countDocuments(filter);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin User Edit
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, mobile, avatar, profilePicture, role, status, isBlocked } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const changes = {};

    if (name !== undefined && name !== user.name) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      changes.name = { old: user.name, new: name };
      user.name = name;
    }

    if (email !== undefined && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email' });
      }
      const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
      changes.email = { old: user.email, new: cleanEmail };
      user.email = cleanEmail;
    }

    const newMobile = mobileNumber !== undefined ? mobileNumber : mobile;
    if (newMobile !== undefined && newMobile !== user.mobileNumber) {
      changes.mobileNumber = { old: user.mobileNumber, new: newMobile };
      user.mobileNumber = newMobile;
      user.mobile = newMobile || '';
    }

    const newAvatar = profilePicture !== undefined ? profilePicture : avatar;
    if (newAvatar !== undefined && newAvatar !== user.profilePicture) {
      let finalAvatar = newAvatar;
      if (newAvatar && newAvatar.startsWith('data:image')) {
        finalAvatar = await uploadToCloudinary(newAvatar);
      }
      changes.profilePicture = { old: user.profilePicture, new: finalAvatar };
      user.profilePicture = finalAvatar;
      user.avatar = finalAvatar;
    }

    if (role !== undefined && role !== user.role) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      changes.role = { old: user.role, new: role };
      user.role = role;
    }

    const newStatus = status !== undefined ? status : (isBlocked !== undefined ? (isBlocked ? 'suspended' : 'active') : undefined);
    if (newStatus !== undefined && newStatus !== user.status) {
      if (!['active', 'suspended'].includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      changes.status = { old: user.status, new: newStatus };
      user.status = newStatus;
      user.isBlocked = newStatus === 'suspended';
    }

    if (Object.keys(changes).length > 0) {
      await user.save();

      await AdminActivityLog.create({
        adminId: req.user._id,
        action: 'EDIT_USER',
        targetId: user._id,
        targetModel: 'User',
        details: {
          username: user.name,
          email: user.email,
          changes
        }
      });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Admin Activity Logs
exports.getAdminActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action = '' } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (action) {
      filter.action = action;
    }

    const logs = await AdminActivityLog.find(filter)
      .populate('adminId', 'name email avatar')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminActivityLog.countDocuments(filter);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Notifications Management
exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 15, type = 'all', isRead = 'all' } = req.query;
    const skip = (page - 1) * limit;

    const filter = { recipientRole: 'admin' };
    if (type !== 'all') filter.type = type;
    if (isRead !== 'all') filter.isRead = isRead === 'true';

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ recipientRole: 'admin', isRead: false });

    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientRole: 'admin', isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};