const mongoose = require('mongoose');

const FAQsSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    aliases: [{ type: String }],
    keywords: [{ type: String }],
    priority: { type: Number, default: 0 },
    category: { type: String },
    status: { type: String, enum: ['Active', 'Draft', 'Archived'], default: 'Active' },
    language: { type: String, default: 'en' },
    tags: [{ type: String }],
    usageCount: { type: Number, default: 0 },

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

FAQsSchema.index({ question: 'text', keywords: 'text', aliases: 'text' });
FAQsSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model('FAQs', FAQsSchema);
