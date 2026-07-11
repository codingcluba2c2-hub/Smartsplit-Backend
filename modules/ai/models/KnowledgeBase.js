const mongoose = require('mongoose');

const KnowledgeBaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['PDF', 'DOCX', 'TXT', 'CSV', 'Markdown', 'HTML', 'JSON', 'Image', 'Website', 'URL'], required: true },
    sourceUri: { type: String },
    category: { type: String, default: 'Uncategorized' },
    language: { type: String, default: 'en' },
    tags: [{ type: String }],
    version: { type: Number, default: 1 },
    contentHash: { type: String },
    status: { type: String, enum: ['Pending', 'Processing', 'Indexed', 'Failed'], default: 'Pending' },
    totalChunks: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    hasEmbeddings: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

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

KnowledgeBaseSchema.index({ type: 1, status: 1 });
KnowledgeBaseSchema.index({ category: 1 });
KnowledgeBaseSchema.index({ tags: 1 });
KnowledgeBaseSchema.index({ title: 'text', category: 'text', tags: 'text' });

module.exports = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);
