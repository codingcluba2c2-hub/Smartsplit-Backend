class RankingEngine {
  /**
   * Applies Reciprocal Rank Fusion (RRF) to combine results from multiple searches.
   * RRF Score = sum(1 / (k + rank_i))
   */
  reciprocalRankFusion(vectorResults, keywordResults, k = 60) {
    const fusionMap = new Map();

    const addResults = (results) => {
      results.forEach((item, index) => {
        const id = item.id.toString();
        const rank = index + 1;
        const score = 1 / (k + rank);

        if (!fusionMap.has(id)) {
          fusionMap.set(id, { ...item, rrfScore: 0 });
        }
        fusionMap.get(id).rrfScore += score;
      });
    };

    addResults(vectorResults);
    addResults(keywordResults);

    const fused = Array.from(fusionMap.values());
    fused.sort((a, b) => b.rrfScore - a.rrfScore);

    return fused;
  }
}

module.exports = new RankingEngine();
