const MockEmbeddingProvider = require('../providers/embeddings/MockEmbeddingProvider');

class EmbeddingEngine {
  constructor() {
    this.provider = new MockEmbeddingProvider();
  }

  async generateEmbeddingsForChunks(chunks) {
    const texts = chunks.map(c => c.text);
    const embeddings = await this.provider.generateEmbeddings(texts);
    
    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i]
    }));
  }

  async generateEmbeddingForQuery(query) {
    return this.provider.generateEmbedding(query);
  }
}

module.exports = new EmbeddingEngine();
