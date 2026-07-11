class IVectorProvider {
  async upsertVectors(collectionName, vectors) { throw new Error('Not Implemented'); }
  async search(collectionName, queryVector, topK, filter = {}) { throw new Error('Not Implemented'); }
  async deleteVectors(collectionName, ids) { throw new Error('Not Implemented'); }
}

module.exports = IVectorProvider;