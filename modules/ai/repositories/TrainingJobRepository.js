const TrainingJobs = require('../models/TrainingJobs');

class TrainingJobRepository {
  async createJob(data) {
    return TrainingJobs.create(data);
  }

  async updateJobStatus(jobId, status, logs = [], error = null) {
    const updateData = { status, updatedAt: new Date() };
    if (error) updateData.error = error;
    if (status === 'Completed') updateData.completedAt = new Date();
    
    const updateQuery = { $set: updateData };
    if (logs && logs.length > 0) {
      updateQuery.$push = { logs: { $each: logs } };
    }

    return TrainingJobs.findByIdAndUpdate(jobId, updateQuery, { new: true });
  }

  async findPendingJobs() {
    return TrainingJobs.find({ status: 'Queued' }).sort({ createdAt: 1 });
  }

  async findJobsByKnowledgeBaseId(kbId) {
    return TrainingJobs.find({ referenceId: kbId, referenceType: 'KnowledgeBase' }).sort({ createdAt: -1 });
  }
}

module.exports = new TrainingJobRepository();
