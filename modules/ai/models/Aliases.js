const mongoose = require('mongoose');

const AliasesSchema = new mongoose.Schema(
  {
    canonicalConcept: { type: String, required: true, trim: true },
    synonyms: [{ type: String, required: true }],
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

AliasesSchema.index({ canonicalConcept: 1 });
AliasesSchema.index({ synonyms: 1 });

module.exports = mongoose.model('Aliases', AliasesSchema);
