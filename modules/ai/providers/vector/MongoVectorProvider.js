const IVectorProvider = require('./IVectorProvider');
const KnowledgeChunksRepository = require('../../repositories/KnowledgeChunksRepository');

class MongoVectorProvider extends IVectorProvider {
  /**
   * For MongoDB, vectors are stored inside the chunks document.
   * Upserting means updating or creating the chunks.
   * This is generally handled by the KnowledgeChunksRepository, 
   * but we provide the abstraction here.
   */
  async upsertVectors(collectionName, vectors) {
    // In our architecture, the collectionName is essentially 'KnowledgeChunks'
    // vectors should be an array of objects: { id (chunk id), vector, payload (chunk document data) }
    // Since KnowledgeChunksRepository.saveChunks handles full documents, we map it.
    const chunksToSave = vectors.map(v => ({
      ...v.payload,
      embedding: v.vector
    }));
    return KnowledgeChunksRepository.saveChunks(chunksToSave);
  }

  /**
   * Search for similar vectors. 
   * In a real MongoDB Atlas environment with Vector Search, this uses $vectorSearch.
   * In local/standard MongoDB without Atlas Vector Search, we'd mock it with cosine similarity in JS.
   */
  async search(collectionName, queryVector, topK, filter = {}) {
    // Mocking the vector search since pure local Mongoose doesn't support $vectorSearch natively
    // We fetch chunks and rank them in memory for this MVP.
    const chunks = await KnowledgeChunksRepository.findSimilarChunks(queryVector, topK * 10);
    
    // Calculate cosine similarity
    const calculateCosineSimilarity = (vecA, vecB) => {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let dotProduct = 0, normA = 0, normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    const scoredChunks = chunks.map(chunk => ({
      chunk,
      score: calculateCosineSimilarity(queryVector, chunk.embedding)
    }));

    // Filter by a minimum threshold (e.g., 0.65) to avoid returning completely irrelevant chunks
    // The exact threshold depends on the embedding model. 0.65 is a safe minimum for general embeddings.
    const relevantChunks = scoredChunks.filter(sc => sc.score > 0.65);
    
    // Sort by score descending and return topK
    relevantChunks.sort((a, b) => b.score - a.score);
    return relevantChunks.slice(0, topK).map(sc => ({
      id: sc.chunk._id.toString(),
      score: sc.score,
      payload: sc.chunk
    }));
  }

  async deleteVectors(collectionName, filter) {
    // If filter is by knowledgeBaseId, we use the repo
    if (filter.knowledgeBaseId) {
      return KnowledgeChunksRepository.deleteByKnowledgeBaseId(filter.knowledgeBaseId);
    }
    throw new Error('Unsupported delete filter for MongoVectorProvider');
  }
}

module.exports = MongoVectorProvider;
