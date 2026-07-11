const mongoose = require('mongoose');

const greetingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  intent: { type: String, enum: ['greeting', 'farewell', 'fastpath', 'faq'], default: 'greeting' },
  description: { type: String },
  priority: { type: Number, default: 0 },
  aliases: [{ type: String }],
  languages: [{ type: String, default: ['en'] }],
  channel: { type: String, default: 'all' },
  regexGenerated: { type: String },
  responseTemplate: { type: String, required: true },
  status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
  triggerCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

greetingSchema.index({ status: 1 });
greetingSchema.index({ priority: -1 });
greetingSchema.index({ language: 1 });
greetingSchema.index({ aliases: 1 });

module.exports = mongoose.model('Greeting', greetingSchema);
