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

exports.respondSettlement = async (req, res) => {
  const { action, disputeReason } = req.body;
  const validActions = ['accept', 'dispute'];

  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ message: 'Settlement request not found' });
    if (settlement.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the receiver can respond to this request' });
    }
    if (settlement.status !== 'pending') {
      return res.status(400).json({ message: 'Settlement request already resolved' });
    }
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (action === 'accept') {
      settlement.status = 'completed';
      settlement.settledAt = new Date();
      
      await Notification.create({
        title: 'Settlement Accepted',
        message: 'Your settlement request has been accepted.',
        type: 'success',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'user',
        recipientId: settlement.payerId
      });
    } else if (action === 'dispute') {
      settlement.status = 'disputed';
      if (disputeReason) {
        settlement.disputeReason = disputeReason;
      }
      
      await Notification.create({
        title: 'Settlement Disputed',
        message: 'A settlement request requires admin review due to a dispute.',
        type: 'alert',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'admin'
      });
      
      await Notification.create({
        title: 'Settlement Disputed',
        message: `Your settlement request was disputed: ${disputeReason || 'No reason provided'}`,
        type: 'alert',
        targetId: settlement._id,
        targetModel: 'Settlement',
        recipientRole: 'user',
        recipientId: settlement.payerId
      });
    }
    
    await settlement.save();

    res.json(settlement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
