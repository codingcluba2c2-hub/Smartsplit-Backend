const ChunkingEngine = require('./ChunkingEngine');
const MetadataExtractor = require('./MetadataExtractor');
const knowledgeRepo = require('../repositories/KnowledgeRepository');
const PlaceholderEmbeddingProvider = require('../providers/embedding/PlaceholderEmbeddingProvider');

class DocumentPipeline {
  constructor() {
    this.chunker = new ChunkingEngine();
    this.embedder = new PlaceholderEmbeddingProvider();
  }

  async processUpload(file, rawText) {
    // 1. Metadata
    const metadata = MetadataExtractor.extract(file, rawText);
    const doc = await knowledgeRepo.createDocument({
      title: metadata.title,
      type: 'TXT', // placeholder
      sourceUri: file.path || 'local-upload',
      status: 'Processing',
      metadata
    });

    // 2. Chunking
    const textChunks = this.chunker.chunk(rawText);
    
    // 3. Embed
    const embeddings = await this.embedder.embedBatch(textChunks);

    // 4. Save
    const chunksToSave = textChunks.map((text, i) => ({
      knowledgeBaseId: doc._id,
      chunkIndex: i,
      text,
      embedding: embeddings[i],
      metadata: { ...metadata, chunkId: i }
    }));

    await knowledgeRepo.saveChunks(chunksToSave);
    
    // Mark complete
    doc.status = 'Completed';
    await doc.save();
    
    return doc;
  }
}

module.exports = new DocumentPipeline();