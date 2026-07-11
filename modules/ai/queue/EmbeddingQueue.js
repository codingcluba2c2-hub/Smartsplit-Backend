// Placeholder for BullMQ or similar
class EmbeddingQueue {
  async addJob(jobData) {
    console.log(`[EmbeddingQueue] Added job for doc: ${jobData.documentId}`);
    // In background: trigger DocumentPipeline.processUpload
  }
}

module.exports = new EmbeddingQueue();