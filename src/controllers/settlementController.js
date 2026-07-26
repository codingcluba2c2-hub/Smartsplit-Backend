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
  const { action, disputeReason } = req.body;
  const validActions = ['accept', 'dispute'];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settlement = await Settlement.findById(req.params.id).session(session);
    if (!settlement) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Settlement request not found' });
    }
    if (settlement.receiverId.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Only the receiver can respond to this request' });
    }
    if (settlement.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Settlement request already resolved' });
    }
    if (!validActions.includes(action)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (action === 'accept') {
      settlement.status = 'completed';
      settlement.settledAt = new Date();
      
      await Notification.create([{
        title: 'Settlement Accepted',
        message: 'Your settlement request has been accepted.',
        type: 'success',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'user',
        recipientId: settlement.payerId
      }], { session });
    } else if (action === 'dispute') {
      settlement.status = 'disputed';
      if (disputeReason) {
        settlement.disputeReason = disputeReason;
      }
      
      await Notification.create([{
        title: 'Settlement Disputed',
        message: 'A settlement request requires admin review due to a dispute.',
        type: 'alert',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'admin'
      }], { session });
      
      await Notification.create([{
        title: 'Settlement Disputed',
        message: `Your settlement request was disputed: ${disputeReason || 'No reason provided'}`,
        type: 'alert',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'user',
        recipientId: settlement.payerId
      }], { session });
    }
    
    await settlement.save({ session });

    await session.commitTransaction();
    session.endSession();

    // After transaction succeeds, immediately recalculate balances and emit socket event to invalidate frontend cache
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
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};
