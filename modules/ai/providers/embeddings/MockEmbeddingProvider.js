const IEmbeddingProvider = require('./IEmbeddingProvider');

class MockEmbeddingProvider extends IEmbeddingProvider {
  constructor(dimension = 768) {
    super();
    this.dimension = dimension;
  }

  async generateEmbedding(text) {
    // Generate a deterministic fake vector based on the string length to mock the provider
    const vector = new Array(this.dimension).fill(0);
    const hashValue = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < this.dimension; i++) {
      // Create some pseudo-random but deterministic values between -1 and 1
      vector[i] = Math.sin(hashValue * (i + 1)) / (i + 1);
    }
    
    // Normalize the vector (L2 norm)
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    
    return vector.map(val => val / magnitude);
  }

  async generateEmbeddings(texts) {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  getDimension() {
    return this.dimension;
  }
}

module.exports = MockEmbeddingProvider;
