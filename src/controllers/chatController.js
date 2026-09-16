const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Group = require('../models/Group');
const { emitToGroup, emitToUser } = require('../services/socketService');
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

// --- DIRECT USER-TO-USER CHAT CONTROLLERS ---

// Get last 100 messages for a direct conversation
exports.getDirectChatMessages = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user._id;

    console.log(`[DIRECT CHAT DB] getDirectChatMessages: User ${userId} (${req.user.name}) requesting chat with Recipient ${recipientId}`);

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      console.warn(`[DIRECT CHAT DB] Invalid recipientId: ${recipientId}`);
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const recipientObjId = new mongoose.Types.ObjectId(recipientId);

    const messages = await Chat.find({
      $or: [
        { senderId: userObjId, recipientId: recipientObjId },
        { senderId: recipientObjId, recipientId: userObjId },
        { senderId: userId.toString(), recipientId: recipientId.toString() },
        { senderId: recipientId.toString(), recipientId: userId.toString() }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(100);

    // Auto mark received unread messages as read
    await Chat.updateMany(
      { senderId: recipientObjId, recipientId: userObjId, isRead: false },
      { $set: { isRead: true } }
    );

    console.log(`[DIRECT CHAT DB] Found ${messages.length} messages between ${userId} and ${recipientId}`);
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching direct chat messages:', error);
    res.status(500).json({ message: error.message });
  }
};

// Send a direct message to a user
exports.sendDirectMessage = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { message, messageType, mediaUrl, mediaPublicId, fileName, fileSize, duration } = req.body;

    console.log(`[DIRECT CHAT DB] sendDirectMessage: User ${req.user._id} (${req.user.name}) sending to Recipient ${recipientId}: "${message}"`);

    if (!message && !mediaUrl) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      console.warn(`[DIRECT CHAT DB] Invalid recipientId for sendDirectMessage: ${recipientId}`);
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }

    const senderObjId = new mongoose.Types.ObjectId(req.user._id);
    const recipientObjId = new mongoose.Types.ObjectId(recipientId);

    const newMessage = await Chat.create({
      recipientId: recipientObjId,
      senderId: senderObjId,
      senderName: req.user.name || 'User',
      message: message || '',
      messageType: messageType || 'text',
      mediaUrl,
      mediaPublicId,
      fileName,
      fileSize,
      duration
    });

    console.log(`[DIRECT CHAT DB] Message created in MongoDB with ID: ${newMessage._id}`);

    // Emit to room calculated by sorting user IDs and personal user rooms
    const roomName = [req.user._id.toString(), recipientId.toString()].sort().join('_');
    console.log(`[DIRECT CHAT DB] Emitting newMessage to socket room: ${roomName} and personal rooms`);
    emitToGroup(roomName, 'newMessage', newMessage);
    emitToUser(recipientId, 'newMessage', newMessage);
    emitToUser(req.user._id, 'newMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error in sendDirectMessage:', error);
    res.status(500).json({ message: error.message });
  }
};

// Upload media for direct message
exports.uploadDirectMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'smartsplit/direct_chat');

    res.json({
      mediaUrl: result.secure_url,
      mediaPublicId: result.public_id,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({ message: 'Direct upload failed' });
  }
};

// Mark direct messages from a sender as read
exports.markDirectMessagesAsRead = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user._id;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }

    const recipientObjId = new mongoose.Types.ObjectId(recipientId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    await Chat.updateMany(
      { senderId: recipientObjId, recipientId: userObjId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unread direct chat counts grouped by sender with sender details
exports.getUnreadChatCounts = async (req, res) => {
  try {
    const userId = req.user._id;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const User = require('../models/User');

    // Aggregate unread count grouped by senderId
    const unreadMessages = await Chat.aggregate([
      {
        $match: {
          recipientId: userObjId,
          isRead: false
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$senderId',
          count: { $sum: 1 },
          lastMessage: { $first: '$message' },
          lastMessageType: { $first: '$messageType' },
          lastMediaUrl: { $first: '$mediaUrl' },
          senderName: { $first: '$senderName' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ]);

    // Populate user details for senders
    const senderIds = unreadMessages.map(item => item._id).filter(Boolean);
    const senders = await User.find({ _id: { $in: senderIds } }).select('name email avatar profilePicture mobile');
    const sendersMap = new Map(senders.map(s => [s._id.toString(), s]));

    const countsMap = {};
    const unreadDetails = [];
    let totalUnread = 0;

    unreadMessages.forEach(item => {
      if (item._id) {
        const sId = item._id.toString();
        countsMap[sId] = item.count;
        totalUnread += item.count;

        const senderUser = sendersMap.get(sId);
        const avatar = senderUser?.avatar || senderUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.senderName || 'User')}&background=random`;

        unreadDetails.push({
          senderId: sId,
          senderName: senderUser?.name || item.senderName || 'SmartSplit Contact',
          senderEmail: senderUser?.email || '',
          senderAvatar: avatar,
          count: item.count,
          lastMessage: item.lastMessage || (item.lastMediaUrl ? '📎 Attachment' : 'New message'),
          timestamp: item.timestamp
        });
      }
    });

    res.json({ counts: countsMap, totalUnread, items: unreadDetails });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get recent direct chats metadata (last message & timestamp for each contact)
exports.getRecentDirectChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Aggregate to get the latest message for each direct chat conversation involving the user
    const recentMessages = await Chat.aggregate([
      {
        $match: {
          recipientId: { $exists: true, $ne: null },
          $or: [
            { senderId: userObjId },
            { recipientId: userObjId },
            { senderId: userId.toString() },
            { recipientId: userId.toString() }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $project: {
          senderId: 1,
          recipientId: 1,
          message: 1,
          messageType: 1,
          mediaUrl: 1,
          timestamp: 1,
          otherUser: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$senderId', userObjId] },
                  { $eq: ['$senderId', userId.toString()] }
                ]
              },
              then: '$recipientId',
              else: '$senderId'
            }
          }
        }
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$message' },
          lastMessageType: { $first: '$messageType' },
          lastMediaUrl: { $first: '$mediaUrl' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ]);

    const recentMap = {};
    recentMessages.forEach(item => {
      if (item._id) {
        recentMap[item._id.toString()] = {
          text: item.lastMessage || (item.lastMediaUrl ? '📎 Attachment' : ''),
          timestamp: item.timestamp
        };
      }
    });

    res.json({ recentChats: recentMap });
  } catch (error) {
    console.error('Error fetching recent direct chats metadata:', error);
    res.status(500).json({ message: error.message });
  }
};


