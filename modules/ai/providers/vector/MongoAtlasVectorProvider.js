const IVectorProvider = require('./IVectorProvider');

class MongoAtlasVectorProvider extends IVectorProvider {
  async upsertVectors(collectionName, vectors) {
    console.log(`[MongoAtlas] Upserting ${vectors.length} vectors`);
    return true;
  }

  async search(collectionName, queryVector, topK, filter = {}) {
    console.log(`[MongoAtlas] Searching with $vectorSearch`);
    return []; // Placeholder
  }

  async deleteVectors(collectionName, ids) {
    console.log(`[MongoAtlas] Deleting ${ids.length} vectors`);
    return true;
  }
}

module.exports = MongoAtlasVectorProvider;