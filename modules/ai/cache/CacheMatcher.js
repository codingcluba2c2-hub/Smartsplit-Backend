class CacheMatcher {
  
  /**
   * Calculates a weighted score between the new query and a cached query.
   * Weighting: 30% Embedding, 25% Intent, 20% Keyword, 15% Alias, 10% Regex
   */
  static calculateScore(newQueryData, cachedData) {
    let score = 0;

    // 1. Embedding Similarity (Max 30%)
    // Assuming cachedData.score is the cosine similarity from vector search [0, 1]
    const embeddingScore = (cachedData.score || 0) * 0.30;
    score += embeddingScore;

    // 2. Intent Match (Max 25%)
    if (newQueryData.intent && newQueryData.intent === cachedData.intent) {
      score += 0.25;
    }

    // 3. Keyword Match (Max 20%)
    const newKeywords = new Set(newQueryData.normalizedText.split(' '));
    const cachedKeywords = new Set(cachedData.normalizedQuestion.split(' '));
    const intersection = new Set([...newKeywords].filter(x => cachedKeywords.has(x)));
    const keywordJaccard = intersection.size / (newKeywords.size + cachedKeywords.size - intersection.size);
    score += keywordJaccard * 0.20;

    // 4. Alias Match (Max 15%)
    // If the canonical text matches exactly, we give full alias points.
    if (newQueryData.canonicalText && newQueryData.canonicalText === cachedData.normalizedQuestion) {
      score += 0.15;
    }

    // 5. Regex/Pattern Match (Max 10%)
    // If both matched the same strict regex rule
    if (newQueryData.matchedRegex && cachedData.matchedRegex && newQueryData.matchedRegex === cachedData.matchedRegex) {
      score += 0.10;
    }

    return score;
  }

  static findBestMatch(newQueryData, candidates) {
    let bestMatch = null;
    let highestScore = 0;

    for (const candidate of candidates) {
      const score = this.calculateScore(newQueryData, candidate);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = candidate;
      }
    }

    return { bestMatch, highestScore };
  }
}

module.exports = CacheMatcher;
