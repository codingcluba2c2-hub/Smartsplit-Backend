const mongoose = require('mongoose');

const AuditLogsSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    changes: { type: mongoose.Schema.Types.Mixed },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

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

AuditLogsSchema.index({ targetType: 1, targetId: 1 });
AuditLogsSchema.index({ performedBy: 1 });

module.exports = mongoose.model('AuditLogs', AuditLogsSchema);
