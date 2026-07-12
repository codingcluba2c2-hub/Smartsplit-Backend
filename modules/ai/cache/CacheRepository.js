const SemanticCache = require('../models/SemanticCache');

class CacheRepository {
  async save(cacheData) {
    try {
      const cacheEntry = new SemanticCache(cacheData);
      return await cacheEntry.save();
    } catch (e) {
      if (e.code === 11000) {
        // duplicate key (cacheKey already exists), update instead
        return this.update(cacheData.cacheKey, cacheData);
      }
      throw e;
    }
  }

  async findByKey(cacheKey) {
    return SemanticCache.findOne({ cacheKey });
  }
  
  async update(cacheKey, updateData) {
    return SemanticCache.findOneAndUpdate(
      { cacheKey },
      { $set: updateData },
      { new: true, upsert: true }
    );
  }

  async recordHit(cacheKey) {
    return SemanticCache.findOneAndUpdate(
      { cacheKey },
      { 
        $inc: { hitCount: 1 }, 
        $set: { lastHitAt: Date.now() } 
      },
      { new: true }
    );
  }

  // Uses MongoDB Atlas Vector Search (requires index definition in Atlas)
  async vectorSearch(embedding, topK = 5) {
    try {
      // Basic aggregate pipeline for vector search.
      // Note: In production, this requires an Atlas Search index on questionEmbedding
      return await SemanticCache.aggregate([
        {
          $vectorSearch: {
            index: "cache_vector_index",
            path: "questionEmbedding",
            queryVector: embedding,
            numCandidates: topK * 10,
            limit: topK
          }
        },
        {
          $project: {
            _id: 1,
            cacheKey: 1,
            normalizedQuestion: 1,
            intent: 1,
            response: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);
    } catch (e) {
      console.warn("Vector search failed, likely missing Atlas Search index. Fallback to basic match.");
      return [];
    }
  }
  async clearAll() {
    return SemanticCache.deleteMany({});
  }

  async getStats() {
    const count = await SemanticCache.countDocuments();
    return { count };
  }
}

module.exports = new CacheRepository();
