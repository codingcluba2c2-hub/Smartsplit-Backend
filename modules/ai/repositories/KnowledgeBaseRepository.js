const KnowledgeBase = require('../models/KnowledgeBase');

class KnowledgeBaseRepository {
  async createDocument(metadata) {
    return KnowledgeBase.create(metadata);
  }

  async updateDocument(id, updateData) {
    return KnowledgeBase.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findById(id) {
    return KnowledgeBase.findById(id);
  }

  async findAll(query = {}, skip = 0, limit = 50) {
    return KnowledgeBase.find({ isDeleted: false, ...query })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploader', 'name email');
  }

  async count(query = {}) {
    return KnowledgeBase.countDocuments({ isDeleted: false, ...query });
  }

  async softDeleteDocument(id) {
    return KnowledgeBase.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
  }

  async getAnalytics() {
    const total = await KnowledgeBase.countDocuments({ isDeleted: false });
    const indexed = await KnowledgeBase.countDocuments({ isDeleted: false, status: 'Indexed' });
    const failed = await KnowledgeBase.countDocuments({ isDeleted: false, status: 'Failed' });
    
    // Get aggregate counts for chunks and tokens
    const stats = await KnowledgeBase.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, totalChunks: { $sum: "$totalChunks" }, totalTokens: { $sum: "$totalTokens" } } }
    ]);

    return {
      total,
      indexed,
      failed,
      totalChunks: stats[0]?.totalChunks || 0,
      totalTokens: stats[0]?.totalTokens || 0
    };
  }
}

module.exports = new KnowledgeBaseRepository();
