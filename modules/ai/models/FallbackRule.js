const mongoose = require('mongoose');

const fallbackRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  priority: { type: Number, default: 0 },
  minConfidence: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  fallbackMessage: { type: String, required: true },
  escalationSettings: {
    enabled: { type: Boolean, default: false },
    timeout: { type: Number, default: 60 },
    humanQueue: { type: Boolean, default: false },
    department: { type: String },
    priorityLevel: { type: String, default: 'normal' },
    workingHoursOnly: { type: Boolean, default: false },
    outsideOfficeRule: { type: String }
  },
  status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

fallbackRuleSchema.index({ status: 1 });
fallbackRuleSchema.index({ priority: -1 });

module.exports = mongoose.model('FallbackRule', fallbackRuleSchema);
