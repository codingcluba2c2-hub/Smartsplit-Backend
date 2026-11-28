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
      $and: [
        {
          $or: [
            { senderId: userObjId, recipientId: recipientObjId },
            { senderId: recipientObjId, recipientId: userObjId },
            { senderId: userId.toString(), recipientId: recipientId.toString() },
            { senderId: recipientId.toString(), recipientId: userId.toString() }
          ]
        },
        { deletedFor: { $nin: [userObjId, userId.toString()] } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(100);

    // Auto mark received unread messages as read
    await Chat.updateMany(
      { senderId: recipientObjId, recipientId: userObjId, isRead: false, deletedFor: { $nin: [userObjId, userId.toString()] } },
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
    const { message, messageType, mediaUrl, mediaPublicId, fileName, fileSize, duration, isForwarded } = req.body;

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
      duration,
      isForwarded: Boolean(isForwarded)
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
          isRead: false,
          deletedFor: { $nin: [userObjId, userId.toString()] },
          isDeletedForEveryone: { $ne: true }
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

    // Aggregate to get the latest non-cleared message for each direct chat conversation involving the user
    const recentMessages = await Chat.aggregate([
      {
        $match: {
          recipientId: { $exists: true, $ne: null },
          deletedFor: { $nin: [userObjId, userId.toString()] },
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
          isDeletedForEveryone: 1,
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
          isDeletedForEveryone: { $first: '$isDeletedForEveryone' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ]);

    const recentMap = {};
    recentMessages.forEach(item => {
      if (item._id) {
        recentMap[item._id.toString()] = {
          text: item.isDeletedForEveryone
            ? 'This message was deleted'
            : (item.lastMessage || (item.lastMediaUrl ? '📎 Attachment' : '')),
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

// Clear direct chat history for the requesting user (persisted in DB)
exports.clearDirectChat = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user._id;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const recipientObjId = new mongoose.Types.ObjectId(recipientId);

    const conversationMatch = {
      $or: [
        { senderId: userObjId, recipientId: recipientObjId },
        { senderId: recipientObjId, recipientId: userObjId },
        { senderId: userId.toString(), recipientId: recipientId.toString() },
        { senderId: recipientId.toString(), recipientId: userId.toString() }
      ]
    };

    await Promise.all([
      Chat.updateMany(conversationMatch, { $addToSet: { deletedFor: userObjId } }),
      Chat.updateMany(
        { senderId: recipientObjId, recipientId: userObjId, isRead: false },
        { $set: { isRead: true } }
      )
    ]);

    emitToUser(userId, 'directChatCleared', { recipientId: recipientId.toString() });

    res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Error clearing direct chat:', error);
    res.status(500).json({ message: error.message });
  }
};

// Edit a direct chat message (sender only)
exports.editDirectMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage) {
      return res.status(400).json({ message: 'Updated message text is required' });
    }

    const chatMsg = await Chat.findById(messageId);
    if (!chatMsg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (chatMsg.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    if (chatMsg.isDeletedForEveryone) {
      return res.status(400).json({ message: 'Deleted messages cannot be edited' });
    }

    chatMsg.message = trimmedMessage;
    chatMsg.isEdited = true;
    chatMsg.editedAt = new Date();
    await chatMsg.save();

    const senderIdStr = chatMsg.senderId.toString();
    const recipientIdStr = chatMsg.recipientId ? chatMsg.recipientId.toString() : null;

    if (recipientIdStr) {
      const roomName = [senderIdStr, recipientIdStr].sort().join('_');
      emitToGroup(roomName, 'directMessageUpdated', chatMsg);
      emitToUser(recipientIdStr, 'directMessageUpdated', chatMsg);
    }
    emitToUser(senderIdStr, 'directMessageUpdated', chatMsg);

    res.json(chatMsg);
  } catch (error) {
    console.error('Error editing direct message:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a direct chat message ('me' for any participant, 'everyone' for sender only)
exports.deleteDirectMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const scope = (req.query.scope || req.body?.scope || 'me').toLowerCase();
    const userIdStr = req.user._id.toString();
    const userObjId = new mongoose.Types.ObjectId(req.user._id);

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const chatMsg = await Chat.findById(messageId);
    if (!chatMsg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const senderIdStr = chatMsg.senderId.toString();
    const recipientIdStr = chatMsg.recipientId ? chatMsg.recipientId.toString() : '';

    if (senderIdStr !== userIdStr && recipientIdStr !== userIdStr) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    if (scope === 'everyone') {
      if (senderIdStr !== userIdStr) {
        return res.status(403).json({ message: 'Only the sender can delete a message for everyone' });
      }

      chatMsg.isDeletedForEveryone = true;
      chatMsg.message = '';
      chatMsg.mediaUrl = undefined;
      chatMsg.mediaPublicId = undefined;
      chatMsg.fileName = undefined;
      chatMsg.fileSize = undefined;
      await chatMsg.save();

      const payload = {
        messageId: chatMsg._id.toString(),
        scope: 'everyone',
        updatedMessage: chatMsg
      };

      if (recipientIdStr) {
        const roomName = [senderIdStr, recipientIdStr].sort().join('_');
        emitToGroup(roomName, 'directMessageDeleted', payload);
        emitToUser(recipientIdStr, 'directMessageDeleted', payload);
      }
      emitToUser(senderIdStr, 'directMessageDeleted', payload);

      return res.json({ success: true, scope: 'everyone', message: chatMsg });
    }

    // Default: delete for requesting user only
    await Chat.updateOne(
      { _id: chatMsg._id },
      { $addToSet: { deletedFor: userObjId } }
    );

    const payload = {
      messageId: chatMsg._id.toString(),
      scope: 'me',
      userId: userIdStr
    };
    emitToUser(userIdStr, 'directMessageDeleted', payload);

    res.json({ success: true, scope: 'me', messageId: chatMsg._id.toString() });
  } catch (error) {
    console.error('Error deleting direct message:', error);
    res.status(500).json({ message: error.message });
  }
};

// Forward a direct message (text or media) to one or multiple recipients
exports.forwardDirectMessage = async (req, res) => {
  try {
    const { messageId, recipientIds } = req.body;
    const userIdStr = req.user._id.toString();
    const userObjId = new mongoose.Types.ObjectId(req.user._id);

    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required' });
    }

    const validRecipientIds = [...new Set(recipientIds.filter((id) => mongoose.Types.ObjectId.isValid(id)))];
    if (validRecipientIds.length === 0) {
      return res.status(400).json({ message: 'No valid recipient IDs provided' });
    }

    let sourceContent = {
      message: typeof req.body.message === 'string' ? req.body.message : '',
      messageType: req.body.messageType || 'text',
      mediaUrl: req.body.mediaUrl || undefined,
      mediaPublicId: req.body.mediaPublicId || undefined,
      fileName: req.body.fileName || undefined,
      fileSize: req.body.fileSize || undefined,
      duration: req.body.duration || undefined
    };

    if (messageId) {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: 'Invalid source message ID' });
      }
      const sourceMsg = await Chat.findById(messageId);
      if (!sourceMsg) {
        return res.status(404).json({ message: 'Source message not found' });
      }
      const isParticipant =
        sourceMsg.senderId.toString() === userIdStr ||
        (sourceMsg.recipientId && sourceMsg.recipientId.toString() === userIdStr);
      const isDeletedForUser = (sourceMsg.deletedFor || []).some((id) => id.toString() === userIdStr);

      if (!isParticipant || isDeletedForUser || sourceMsg.isDeletedForEveryone) {
        return res.status(403).json({ message: 'Cannot forward this message' });
      }

      sourceContent = {
        message: sourceMsg.message || '',
        messageType: sourceMsg.messageType || 'text',
        mediaUrl: sourceMsg.mediaUrl,
        mediaPublicId: sourceMsg.mediaPublicId,
        fileName: sourceMsg.fileName,
        fileSize: sourceMsg.fileSize,
        duration: sourceMsg.duration
      };
    }

    if (!sourceContent.message && !sourceContent.mediaUrl) {
      return res.status(400).json({ message: 'Cannot forward an empty message' });
    }

    const createdMessages = await Promise.all(
      validRecipientIds.map(async (targetId) => {
        const recipientObjId = new mongoose.Types.ObjectId(targetId);
        const forwarded = await Chat.create({
          recipientId: recipientObjId,
          senderId: userObjId,
          senderName: req.user.name || 'User',
          message: sourceContent.message,
          messageType: sourceContent.messageType,
          mediaUrl: sourceContent.mediaUrl,
          mediaPublicId: sourceContent.mediaPublicId,
          fileName: sourceContent.fileName,
          fileSize: sourceContent.fileSize,
          duration: sourceContent.duration,
          isForwarded: true
        });

        const roomName = [userIdStr, targetId.toString()].sort().join('_');
        emitToGroup(roomName, 'newMessage', forwarded);
        emitToUser(targetId, 'newMessage', forwarded);
        emitToUser(userIdStr, 'newMessage', forwarded);
        return forwarded;
      })
    );

    res.status(201).json({ success: true, forwardedMessages: createdMessages });
  } catch (error) {
    console.error('Error forwarding direct message:', error);
    res.status(500).json({ message: error.message });
  }
};


