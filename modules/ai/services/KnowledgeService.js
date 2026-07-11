const KnowledgeBaseRepository = require('../repositories/KnowledgeBaseRepository');
const KnowledgeChunksRepository = require('../repositories/KnowledgeChunksRepository');
const TrainingQueueService = require('./TrainingQueueService');
const RetrievalService = require('./RetrievalService');

class KnowledgeService {
  async uploadDocument(data, user) {
    const docData = {
      ...data,
      uploader: user ? user._id : null,
      status: 'Pending'
    };

    const doc = await KnowledgeBaseRepository.createDocument(docData);
    
    // Queue for training/indexing
    const job = await TrainingQueueService.createJob(doc._id);
    
    // Trigger async processing with the file buffer
    TrainingQueueService.processJob(job._id, data.fileBuffer, data.mimeType, data.fileName).catch(console.error);

    return doc;
  }

  async getDashboardData() {
    const analytics = await KnowledgeBaseRepository.getAnalytics();
    const recentDocs = await KnowledgeBaseRepository.findAll({}, 0, 5);
    return { analytics, recentDocs };
  }

  async getDocuments(query = {}, skip = 0, limit = 50) {
    return KnowledgeBaseRepository.findAll(query, skip, limit);
  }

  async getDocumentDetails(id) {
    const doc = await KnowledgeBaseRepository.findById(id);
    const chunks = await KnowledgeChunksRepository.findByKnowledgeBaseId(id);
    return { doc, chunks };
  }

  async deleteDocument(id) {
    await KnowledgeBaseRepository.softDeleteDocument(id);
    await KnowledgeChunksRepository.deleteByKnowledgeBaseId(id);
    return { success: true };
  }

  async searchPreview(query) {
    const results = await RetrievalService.search(query, 5);
    return results;
  }
}

module.exports = new KnowledgeService();
