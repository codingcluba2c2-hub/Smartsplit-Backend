const mongoose = require('mongoose');

const TrainingJobsSchema = new mongoose.Schema(
  {
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    referenceType: { type: String, enum: ['KnowledgeBase', 'FAQ'], required: true },
    action: { type: String, enum: ['Upload', 'Reindex', 'Delete', 'Rollback'], required: true },
    status: { type: String, enum: ['Queued', 'Processing', 'Completed', 'Failed'], default: 'Queued' },
    logs: [{ type: String }],
    completedAt: { type: Date },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    versionKey: '__v',
  }
);

TrainingJobsSchema.index({ status: 1 });
TrainingJobsSchema.index({ referenceId: 1, referenceType: 1 });

module.exports = mongoose.model('TrainingJobs', TrainingJobsSchema);
