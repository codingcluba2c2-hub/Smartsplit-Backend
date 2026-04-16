const Group = require('../models/Group');
const Settlement = require('../models/Settlement');

exports.createSettlement = async (req, res) => {
  const { groupId, receiverId, amount, paymentType, screenshot, note } = req.body;
  const payerId = req.user._id.toString();

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isPayerMember = group.members.some((member) => member.user.toString() === payerId);
    const isReceiverMember = group.members.some((member) => member.user.toString() === receiverId);
    if (!isPayerMember || !isReceiverMember) {
      return res.status(403).json({ message: 'Both payer and receiver must be group members' });
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
      .populate('payerId', 'name avatar email')
      .populate('receiverId', 'name avatar email')
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.respondSettlement = async (req, res) => {
  const { action } = req.body;
  const validActions = ['accept', 'reject'];

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

    settlement.status = action === 'accept' ? 'completed' : 'rejected';
    settlement.settledAt = new Date();
    await settlement.save();

    res.json(settlement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
