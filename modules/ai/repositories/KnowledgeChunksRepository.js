const KnowledgeChunks = require('../models/KnowledgeChunks');

class KnowledgeChunksRepository {
  async saveChunks(chunks) {
    return KnowledgeChunks.insertMany(chunks);
  }

  async findByKnowledgeBaseId(kbId) {
    return KnowledgeChunks.find({ knowledgeBaseId: kbId, isDeleted: false }).sort({ chunkIndex: 1 });
  }

  async deleteByKnowledgeBaseId(kbId) {
    return KnowledgeChunks.updateMany(
      { knowledgeBaseId: kbId },
      { isDeleted: true, deletedAt: new Date() }
    );
  }

  async findSimilarChunks(queryEmbedding, topK = 5, matchThreshold = 0.7) {
    // In a real MongoDB Atlas setup with vector search, you'd use $vectorSearch:
    // return KnowledgeChunks.aggregate([ { $vectorSearch: ... } ]);
    
    // For Mock Provider, we will do a brute-force cosine similarity or let the RetrievalService handle it.
    // For now, we return all chunks and let the service rank them (since this is an MVP without native vector indices).
    // In production, THIS method MUST be replaced by an actual Vector DB query.
    return KnowledgeChunks.find({ isDeleted: false }).limit(topK * 10);
  }
}

module.exports = new KnowledgeChunksRepository();
