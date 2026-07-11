const RankingEngine = require('../ranking/RankingEngine');
const IntentResult = require('../dto/IntentResult');
const PlaceholderEmbeddingProvider = require('../providers/embedding/PlaceholderEmbeddingProvider');
const MongoAtlasVectorProvider = require('../providers/vector/MongoAtlasVectorProvider'); // Defaulting to Mongo Atlas

class HybridRetriever {
  constructor() {
    this.embedder = new PlaceholderEmbeddingProvider();
    this.vectorDb = new MongoAtlasVectorProvider();
  }

  async search(query, topK = 5) {
    // 1. Semantic Search
    const queryVector = await this.embedder.embedText(query);
    const vectorResults = await this.vectorDb.search('KnowledgeChunks', queryVector, topK);
    
    // 2. Keyword Search (Placeholder for Mongo Text Search)
    const keywordResults = []; // e.g. await KnowledgeChunks.find({ $text: { $search: query } }).limit(topK);
    
    // 3. Hybrid Ranking (RRF)
    const rankedResults = RankingEngine.fuse(vectorResults, keywordResults);
    
    // 4. Return Top K chunks
    const finalChunks = rankedResults.slice(0, topK);
    
    // Determine Confidence (Mock logic for now)
    const confidence = finalChunks.length > 0 ? 80 : 0;
    
    const intentResult = new IntentResult('Knowledge', confidence, 'Hybrid Retrieval Complete');
    intentResult.payload = finalChunks; // The raw context chunks for the upcoming LLM
    
    return intentResult;
  }
}

module.exports = new HybridRetriever();