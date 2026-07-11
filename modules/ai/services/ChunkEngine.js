const { getEncoding } = require('js-tiktoken');

class ChunkEngine {
  constructor(config = {}) {
    this.chunkSize = config.chunkSize || 1000;
    this.overlap = config.overlap || 200;
    this.tokenizer = getEncoding('cl100k_base'); // standard for many modern LLMs
  }

  countTokens(text) {
    if (!text) return 0;
    return this.tokenizer.encode(text).length;
  }

  /**
   * Semantic chunking: attempts to split by paragraphs (\n\n), then sentences.
   */
  splitText(text, metadata = {}) {
    const chunks = [];
    
    // First, split by paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    let currentChunk = [];
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);
      
      // If a single paragraph is too large, split by sentences
      if (paragraphTokens > this.chunkSize) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          const sentenceTokens = this.countTokens(sentence);
          
          if (currentTokens + sentenceTokens > this.chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n\n'));
            // Keep overlap (rough approximation by taking the last chunk's text and halving)
            // A precise semantic overlap would keep the last N sentences
            const overlapSentences = currentChunk.slice(-2); // keep last 2 sentences/paragraphs as overlap
            currentChunk = [...overlapSentences];
            currentTokens = this.countTokens(currentChunk.join('\n\n'));
          }
          currentChunk.push(sentence);
          currentTokens += sentenceTokens;
        }
      } else {
        if (currentTokens + paragraphTokens > this.chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.join('\n\n'));
          const overlapParagraphs = currentChunk.slice(-1); // keep last paragraph
          currentChunk = [...overlapParagraphs];
          currentTokens = this.countTokens(currentChunk.join('\n\n'));
        }
        currentChunk.push(paragraph);
        currentTokens += paragraphTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }

    return chunks.map((chunkText, index) => ({
      chunkIndex: index,
      text: chunkText.trim(),
      tokenCount: this.countTokens(chunkText),
      metadata: { ...metadata, position: index }
    }));
  }
}

module.exports = new ChunkEngine();
