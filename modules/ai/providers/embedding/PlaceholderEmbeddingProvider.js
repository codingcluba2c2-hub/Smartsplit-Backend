const IEmbeddingProvider = require('./IEmbeddingProvider');

class PlaceholderEmbeddingProvider extends IEmbeddingProvider {
  async embedText(text) {
    // Generate a fake 384-dimensional vector
    return new Array(384).fill(0).map(() => Math.random());
  }

  async embedBatch(texts) {
    return Promise.all(texts.map(t => this.embedText(t)));
  }
}

module.exports = PlaceholderEmbeddingProvider;