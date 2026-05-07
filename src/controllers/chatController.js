const Chat = require('../models/Chat');
const Group = require('../models/Group');
const { emitToGroup } = require('../services/socketService');
const { uploadToCloudinary } = require('../services/cloudinary');

// Get last 50 messages for a group
exports.getChatMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify user is member of the group
    const group = await Group.findOne({
      _id: groupId,
      'members.user': req.user._id
    });

    if (!group) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    const messages = await Chat.find({ groupId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message, messageType, mediaUrl, mediaPublicId, fileName, fileSize, duration } = req.body;

    if (!message && !mediaUrl) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify user is member of the group
    const group = await Group.findOne({
      _id: groupId,
      'members.user': req.user._id
    });

    if (!group) {
      return res.status(403).json({ message: 'Not authorized to post in this chat' });
    }

    const newMessage = await Chat.create({
      groupId,
      senderId: req.user._id,
      senderName: req.user.name,
      message,
      messageType: messageType || 'text',
      mediaUrl,
      mediaPublicId,
      fileName,
      fileSize,
      duration
    });

    // Emit to group members via socket
    emitToGroup(groupId, 'newMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload media
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    res.json({
      mediaUrl: result.secure_url,
      mediaPublicId: result.public_id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      duration: req.body.duration // Duration passed from frontend for voice
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
};
