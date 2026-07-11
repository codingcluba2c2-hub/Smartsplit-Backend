const mongoose = require('mongoose');

const ruleVersionSchema = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ruleType: { type: String, enum: ['Greeting', 'FallbackRule'], required: true },
  versionData: { type: Object, required: true },
  changes: { type: Object },
  versionNumber: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ruleVersionSchema.index({ ruleId: 1, versionNumber: -1 });

module.exports = mongoose.model('RuleVersion', ruleVersionSchema);
