const TrainingJobRepository = require('../repositories/TrainingJobRepository');
const KnowledgeBaseRepository = require('../repositories/KnowledgeBaseRepository');
const ChunkEngine = require('./ChunkEngine');
const EmbeddingEngine = require('./EmbeddingEngine');
const MongoVectorProvider = require('../providers/vector/MongoVectorProvider');
const DocumentParser = require('../knowledge/DocumentParser');

class TrainingQueueService {
  constructor() {
    this.vectorProvider = new MongoVectorProvider();
  }

  async createJob(knowledgeBaseId, type = 'DocumentIndex') {
    return TrainingJobRepository.createJob({
      referenceId: knowledgeBaseId,
      referenceType: 'KnowledgeBase',
      action: 'Upload',
      status: 'Queued',
      logs: [`[${new Date().toISOString()}] Job created and queued.`]
    });
  }

  /**
   * Processes a single document for RAG indexing.
   */
  async processJob(jobId, fileBuffer, mimeType, fileName) {
    try {
      let job = await TrainingJobRepository.updateJobStatus(jobId, 'Processing', [`[${new Date().toISOString()}] Started processing.`]);
      const doc = await KnowledgeBaseRepository.findById(job.referenceId);
      
      if (!doc) throw new Error('Knowledge base document not found.');

      await KnowledgeBaseRepository.updateDocument(doc._id, { status: 'Processing' });
      await TrainingJobRepository.updateJobStatus(jobId, 'Processing', [`[${new Date().toISOString()}] Extracting text from document...`]);

      // Real text extraction
      const extractedText = await DocumentParser.parse(fileBuffer, mimeType, fileName);
      
      await TrainingJobRepository.updateJobStatus(jobId, 'Processing', [`[${new Date().toISOString()}] Chunking text semantically...`]);
      
      const chunks = ChunkEngine.splitText(extractedText, { sourceUri: fileName });
      await TrainingJobRepository.updateJobStatus(jobId, 'Processing', [`[${new Date().toISOString()}] Created ${chunks.length} chunks. Generating embeddings.`]);

      const chunksWithEmbeddings = await EmbeddingEngine.generateEmbeddingsForChunks(chunks);
      
      // Update tokens and chunks count on doc
      const totalTokens = chunksWithEmbeddings.reduce((sum, c) => sum + c.tokenCount, 0);

      // Save to vector store (Mongo KnowledgeChunks)
      await this.vectorProvider.upsertVectors('KnowledgeChunks', chunksWithEmbeddings.map((c, i) => ({
        id: `${doc._id}_${i}`,
        vector: c.embedding,
        payload: {
          knowledgeBaseId: doc._id,
          chunkIndex: i,
          text: c.text,
          tokenCount: c.tokenCount,
          metadata: c.metadata
        }
      })));

      // Finalize
      await KnowledgeBaseRepository.updateDocument(doc._id, { 
        status: 'Indexed', 
        totalChunks: chunks.length, 
        totalTokens,
        hasEmbeddings: true
      });

      await TrainingJobRepository.updateJobStatus(jobId, 'Completed', [`[${new Date().toISOString()}] Indexing completed successfully.`]);
    } catch (error) {
      console.error(error);
      const job = await TrainingJobRepository.updateJobStatus(jobId, 'Failed', [`[${new Date().toISOString()}] Error processing job: ${error.message}`], error.message);
      if (job && job.referenceId) {
         await KnowledgeBaseRepository.updateDocument(job.referenceId, { status: 'Failed' });
      }
    }
  }
}

module.exports = new TrainingQueueService();
