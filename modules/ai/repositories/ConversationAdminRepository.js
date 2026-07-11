const Conversations = require('../models/Conversations');
const ConversationHistory = require('../models/ConversationHistory');
const mongoose = require('mongoose');

class ConversationAdminRepository {
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matchToday = {
      $match: {
        createdAt: { $gte: today },
        isDeleted: { $ne: true }
      }
    };

    const statsPipeline = [
      matchToday,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ["$status", "Handoff"] }, 1, 0] } },
          fallback: { $sum: { $cond: [{ $eq: ["$metadata.source", "Fallback"] }, 1, 0] } },
          avgConfidence: { $avg: "$metadata.confidence" },
          avgLatency: { $avg: "$metadata.latency" }
        }
      }
    ];

    const results = await Conversations.aggregate(statsPipeline);
    
    // Default stats if no conversations today
    if (!results || results.length === 0) {
      return {
        total: 0, resolved: 0, escalated: 0, fallback: 0, avgConfidence: 0, avgLatency: 0,
        resolvedRate: 0, fallbackRate: 0
      };
    }

    const data = results[0];
    const resolvedRate = data.total > 0 ? (data.resolved / data.total) * 100 : 0;
    const fallbackRate = data.total > 0 ? (data.fallback / data.total) * 100 : 0;

    return { ...data, resolvedRate, fallbackRate };
  }

  async getPaginatedConversations(filters, page, limit, sortObj) {
    const skip = (page - 1) * limit;
    
    const matchStage = { $match: { isDeleted: { $ne: true } } };
    
    if (filters.search) {
      const searchRegex = new Regex(filters.search, 'i');
      matchStage.$match.$or = [
        { _id: mongoose.Types.ObjectId.isValid(filters.search) ? mongoose.Types.ObjectId(filters.search) : null },
        { title: searchRegex },
        { "metadata.topic": searchRegex }
      ].filter(Boolean);
    }
    
    if (filters.status) matchStage.$match.status = filters.status;
    if (filters.source) matchStage.$match['metadata.source'] = filters.source;
    if (filters.intent) matchStage.$match['metadata.intent'] = filters.intent;
    
    if (filters.dateFrom || filters.dateTo) {
      matchStage.$match.createdAt = {};
      if (filters.dateFrom) matchStage.$match.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) matchStage.$match.createdAt.$lte = new Date(filters.dateTo);
    }

    const pipeline = [
      matchStage,
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortObj || { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                metadata: 1,
                createdAt: 1,
                updatedAt: 1,
                username: "$user.username",
                email: "$user.email",
                name: "$user.name"
              }
            }
          ]
        }
      }
    ];

    const result = await Conversations.aggregate(pipeline);
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const items = result[0].data;

    return { items, total };
  }

  async getConversationById(id) {
    const result = await Conversations.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          metadata: 1,
          createdAt: 1,
          updatedAt: 1,
          username: "$user.username",
          email: "$user.email",
          name: "$user.name"
        }
      }
    ]);
    return result[0] || null;
  }

  async getConversationMessages(conversationId) {
    return await ConversationHistory.aggregate([
      { $match: { conversationId: new mongoose.Types.ObjectId(conversationId), isDeleted: { $ne: true } } },
      { $sort: { createdAt: 1 } }
    ]);
  }

  async softDeleteConversation(id) {
    return await Conversations.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  }

  async bulkSoftDeleteConversations(ids) {
    return await Conversations.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
  }
}

module.exports = new ConversationAdminRepository();