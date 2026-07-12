const mongoose = require('mongoose');

const ResponseTemplatesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  intent: { type: String, required: true },
  category: { type: String, default: 'General' }, // e.g. Expense, Settlement, Knowledge
  priority: { type: Number, default: 0 },
  language: { type: String, default: 'en' },
  
  triggerType: { type: String, enum: ['Intent', 'Knowledge', 'Database', 'FastPath', 'FAQ', 'Regex'], required: true },
  
  template: { type: String, required: true }, // The raw text with {{variables}}
  variables: [{ type: String }], // e.g. ['userName', 'balance', 'currency']
  conditions: { type: Object }, // Optional matching conditions
  
  responseType: { type: String, enum: ['Text', 'Markdown', 'Table', 'Card', 'List'], default: 'Text' },
  tone: { type: String, enum: ['Professional', 'Friendly', 'Formal', 'Technical', 'Simple'], default: 'Professional' },
  
  status: { type: String, enum: ['Active', 'Draft', 'Archived'], default: 'Active' },
  version: { type: Number, default: 1 },
  
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  optimisticConcurrency: true,
  versionKey: '__v'
});

// Indexes
ResponseTemplatesSchema.index({ intent: 1, status: 1 });
ResponseTemplatesSchema.index({ priority: -1 });
ResponseTemplatesSchema.index({ language: 1 });

module.exports = mongoose.model('ResponseTemplates', ResponseTemplatesSchema);
