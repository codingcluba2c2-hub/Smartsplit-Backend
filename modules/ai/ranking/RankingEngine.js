class RankingEngine {
  /**
   * Reciprocal Rank Fusion (RRF) Implementation.
   * Combines multiple ranked lists (e.g. from Keyword Search and Vector Search).
   */
  static fuse(vectorResults, keywordResults, k = 60) {
    const scores = new Map();
    
    // Process Vector Results
    vectorResults.forEach((doc, rank) => {
      scores.set(doc.chunkId, {
        doc,
        score: 1 / (k + rank + 1)
      });
    });
    
    // Process Keyword Results
    keywordResults.forEach((doc, rank) => {
      if (scores.has(doc.chunkId)) {
        scores.get(doc.chunkId).score += 1 / (k + rank + 1);
      } else {
        scores.set(doc.chunkId, {
          doc,
          score: 1 / (k + rank + 1)
        });
      }
    });
    
    // Convert to array and sort by fused score
    const fused = Array.from(scores.values()).sort((a, b) => b.score - a.score);
    return fused.map(f => f.doc);
  }
}

module.exports = RankingEngine;