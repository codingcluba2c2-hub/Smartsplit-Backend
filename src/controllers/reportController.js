const Report = require('../models/Report');
const Notification = require('../models/Notification');

exports.createReport = async (req, res) => {
  try {
    const { type, targetId, reason, description } = req.body;

    if (!type || !targetId || !reason) {
      return res.status(400).json({ message: 'Type, target ID, and reason are required' });
    }

    const report = await Report.create({
      reportedBy: req.user._id,
      type,
      targetId,
      reason,
      description
    });

    // Create a system alert notification for the admin
    await Notification.create({
      title: 'New Dispute/Report Filed',
      message: `User ${req.user.name} reported a ${type}: "${reason}"`,
      type: 'warning',
      targetId: report._id,
      targetModel: 'Report',
      recipientRole: 'admin'
    });

    res.status(201).json({ message: 'Dispute report submitted successfully', report });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
