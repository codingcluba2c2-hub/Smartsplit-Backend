const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Report = require('../models/Report');
const LoginLog = require('../models/LoginLog');

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

    const user = await User.findByIdAndUpdate(id, { isBlocked }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
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

    // Delete related expenses and settlements
    await Expense.deleteMany({ groupId: id });
    await Settlement.deleteMany({ groupId: id });

    const group = await Group.findByIdAndDelete(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

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
      .populate('reportedBy', 'name email')
      .populate('resolvedBy', 'name email')
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