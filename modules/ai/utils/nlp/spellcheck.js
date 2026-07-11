/**
 * Spell Correction Engine
 * Uses Levenshtein distance for fuzzy matching against a dictionary.
 */
class SpellcheckService {
  constructor(aiConfig) {
    this.maxDistance = aiConfig.thresholds.SPELLCHECK_MAX_DISTANCE || 2;
    this.dictionary = ['expense', 'group', 'balance', 'settlement', 'friend', 'payment', 'hello', 'thanks'];
    this.commonMisspellings = {
      'expanse': 'expense',
      'expnse': 'expense',
      'grp': 'group',
      'groop': 'group',
      'grup': 'group',
      'balnce': 'balance',
      'settelment': 'settlement',
      'frend': 'friend',
      'paymant': 'payment',
      'helo': 'hello',
      'hii': 'hello',
      'hy': 'hello',
      'thnks': 'thanks'
    };
  }

  // Basic Levenshtein distance implementation
  static levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
      }
    }
    return matrix[b.length][a.length];
  }

  correct(word) {
    if (this.dictionary.includes(word)) return word;
    if (this.commonMisspellings[word]) return this.commonMisspellings[word];

    let bestMatch = word;
    let minDistance = Infinity;

    for (const dictWord of this.dictionary) {
      const distance = SpellcheckService.levenshteinDistance(word, dictWord);
      if (distance < minDistance && distance <= this.maxDistance) {
        minDistance = distance;
        bestMatch = dictWord;
      }
    }
    return bestMatch;
  }

  correctText(text) {
    return text.split(' ').map(w => this.correct(w)).join(' ');
  }
}

module.exports = SpellcheckService;
