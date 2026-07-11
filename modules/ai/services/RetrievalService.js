const MongoVectorProvider = require('../providers/vector/MongoVectorProvider');
const KnowledgeChunksRepository = require('../repositories/KnowledgeChunksRepository');
const EmbeddingEngine = require('./EmbeddingEngine');
const RankingEngine = require('./RankingEngine');

class RetrievalService {
  constructor() {
    this.vectorProvider = new MongoVectorProvider();
  }

  /**
   * Performs Hybrid Search: Vector Search + Keyword Search, followed by RRF.
   */
  async search(query, topK = 5, filters = {}) {
    // 1. Vector Search
    const queryEmbedding = await EmbeddingEngine.generateEmbeddingForQuery(query);
    const vectorResults = await this.vectorProvider.search('KnowledgeChunks', queryEmbedding, topK, filters);

    // 2. Keyword Search (Mocked for MVP, normally involves MongoDB $text search on Chunks/KnowledgeBase)
    // Here we just use basic regex matching on the active chunks if full text search index is not yet built on Chunks
    const keywordChunks = await KnowledgeChunksRepository.findSimilarChunks(queryEmbedding, topK * 5); // using the same generic fetch for MVP mock
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeQuery.split(' ').join('|'), 'i');
    const keywordResults = keywordChunks
      .filter(c => regex.test(c.text))
      .map(c => ({ id: c._id.toString(), payload: c }))
      .slice(0, topK);

    // 3. Reranking (RRF)
    const reranked = RankingEngine.reciprocalRankFusion(vectorResults, keywordResults);

    // 4. Return topK
    return reranked.slice(0, topK);
  }
}

module.exports = new RetrievalService();
