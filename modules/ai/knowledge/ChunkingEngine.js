class ChunkingEngine {
  constructor(config = {}) {
    this.chunkSize = config.chunkSize || 500;
    this.chunkOverlap = config.chunkOverlap || 50;
  }

  // Very basic implementation of recursive character chunking
  chunk(text) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      // In a real scenario, we would split by sentences or paragraphs instead of hard char limits.
      chunks.push(text.substring(start, end));
      start += (this.chunkSize - this.chunkOverlap);
    }
    
    return chunks;
  }
}

module.exports = ChunkingEngine;