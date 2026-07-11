class IEmbeddingProvider {
  async embedText(text) { throw new Error('Not Implemented'); }
  async embedBatch(texts) { throw new Error('Not Implemented'); }
}

module.exports = IEmbeddingProvider;