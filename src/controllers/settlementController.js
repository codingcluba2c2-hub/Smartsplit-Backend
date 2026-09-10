const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const Notification = require('../models/Notification');

exports.createSettlement = async (req, res) => {
  const { groupId, payerId: customPayerId, receiverId, amount, paymentType, screenshot, note } = req.body;
  const addedBy = req.user._id.toString();
  const payerId = customPayerId || addedBy;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isPayerMember = group.members.some((member) => member.user.toString() === payerId);
    const isReceiverMember = group.members.some((member) => member.user.toString() === receiverId);
    const isAdderMember = group.members.some((member) => member.user.toString() === addedBy);

    if (!isPayerMember || !isReceiverMember || !isAdderMember) {
      return res.status(403).json({ message: 'Payer, receiver, and requester must be group members' });
    }

    if (payerId === receiverId) {
      return res.status(400).json({ message: 'Cannot settle with yourself' });
    }
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid settlement amount' });
    }

    const settlement = await Settlement.create({
      groupId,
      payerId,
      receiverId,
      addedBy,
      amount: parsedAmount,
      paymentType,
      screenshot: screenshot || '',
      note: note || ''
    });

    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGroupSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members.user', 'name avatar');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some((member) => member.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not authorized to view settlements' });

    const settlements = await Settlement.find({ groupId: req.params.groupId })
      .populate([
        { path: 'payerId', select: 'name avatar email' },
        { path: 'receiverId', select: 'name avatar email' },
        { path: 'addedBy', select: 'name avatar email' }
      ])
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const mongoose = require('mongoose');
const socketService = require('../services/socketService');
const { calculateGroupBalances } = require('../services/balanceService');

exports.respondSettlement = async (req, res) => {
  let { action, disputeReason } = req.body;

  // Normalize action names from frontend
  if (['completed', 'approve', 'accept'].includes(action)) {
    action = 'accept';
  } else if (['rejected', 'reject', 'dispute', 'cancel'].includes(action)) {
    action = 'dispute';
  }

  const validActions = ['accept', 'dispute'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ message: 'Invalid action' });
  }

  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (txErr) {
    session = null;
    useTransaction = false;
  }

  try {
    const settlementQuery = Settlement.findById(req.params.id);
    if (useTransaction && session) settlementQuery.session(session);
    const settlement = await settlementQuery;

    if (!settlement) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    const receiverIdStr = String(settlement.receiverId?._id || settlement.receiverId || '');
    const payerIdStr = String(settlement.payerId?._id || settlement.payerId || '');
    const userIdStr = String(req.user?._id || req.user?.id || '');

    const isReceiver = receiverIdStr === userIdStr;
    const isPayer = payerIdStr === userIdStr;
    const isAdmin = req.user?.role === 'admin';

    if (!isReceiver && !isPayer && !isAdmin) {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(403).json({ message: 'Not authorized to respond to this settlement request' });
    }

    if (settlement.status !== 'pending') {
      if (useTransaction && session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ message: 'Settlement request already resolved' });
    }

    if (action === 'accept') {
      settlement.status = 'completed';
      settlement.settledAt = new Date();
      settlement.completedAt = new Date();
      
      await Notification.create([{
        title: 'Settlement Accepted',
        message: 'Your settlement request has been accepted and verified.',
        type: 'success',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'user',
        recipientId: settlement.payerId
      }], (useTransaction && session) ? { session } : undefined);
    } else if (action === 'dispute') {
      settlement.status = 'rejected';
      if (disputeReason) {
        settlement.disputeReason = disputeReason;
      }
      
      await Notification.create([{
        title: 'Settlement Request Rejected',
        message: `Settlement request was rejected: ${disputeReason || 'No reason provided'}`,
        type: 'alert',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'user',
        recipientId: settlement.payerId
      }], (useTransaction && session) ? { session } : undefined);
    }
    
    if (useTransaction && session) {
      await settlement.save({ session });
      await session.commitTransaction();
      session.endSession();
    } else {
      await settlement.save();
    }

    // After transaction succeeds, recalculate balances and emit socket event
    if (action === 'accept') {
      try {
        const updatedSummary = await calculateGroupBalances(settlement.groupId);
        socketService.emitToGroup(settlement.groupId.toString(), 'group:balance_updated', {
          summary: updatedSummary,
          settlementId: settlement._id,
          groupId: settlement.groupId
        });
      } catch (err) {
        console.error('Failed to emit balance update:', err);
      }
    }

    res.json(settlement);
  } catch (error) {
    if (useTransaction && session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (e) {}
    }
    console.error('Error in respondSettlement:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};
