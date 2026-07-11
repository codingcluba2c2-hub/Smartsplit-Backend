const KnowledgeBase = require('../models/KnowledgeBase');
const KnowledgeChunks = require('../models/KnowledgeChunks');

class KnowledgeRepository {
  async createDocument(metadata) {
    return KnowledgeBase.create(metadata);
  }
  
  async saveChunks(chunks) {
    return KnowledgeChunks.insertMany(chunks);
  }

  async softDeleteDocument(id) {
    return KnowledgeBase.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
  }

  async getActiveDocuments() {
    return KnowledgeBase.find({ isDeleted: false });
  }
}

module.exports = new KnowledgeRepository();