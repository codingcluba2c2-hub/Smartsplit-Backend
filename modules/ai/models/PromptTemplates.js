const mongoose = require('mongoose');

const PromptTemplatesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    template: { type: String, required: true },
    variables: [{ type: String }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },

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

PromptTemplatesSchema.index({ name: 1, version: 1 });

module.exports = mongoose.model('PromptTemplates', PromptTemplatesSchema);
