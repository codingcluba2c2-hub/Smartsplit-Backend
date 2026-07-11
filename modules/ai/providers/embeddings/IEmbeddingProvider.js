class IEmbeddingProvider {
  /**
   * Generates embeddings for a single text input.
   * @param {string} text - The input text.
   * @returns {Promise<number[]>} The embedding vector.
   */
  async generateEmbedding(text) {
    throw new Error('Method not implemented.');
  }

  /**
   * Generates embeddings for an array of texts.
   * @param {string[]} texts - The input texts.
   * @returns {Promise<number[][]>} An array of embedding vectors.
   */
  async generateEmbeddings(texts) {
    throw new Error('Method not implemented.');
  }

  /**
   * Returns the vector dimension for this provider.
   * @returns {number} The embedding dimension (e.g. 768 for Gemini)
   */
  getDimension() {
    throw new Error('Method not implemented.');
  }
}

module.exports = IEmbeddingProvider;
