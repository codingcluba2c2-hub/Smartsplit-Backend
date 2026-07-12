class GibberishDetector {
  /**
   * Calculates Shannon entropy for a string.
   */
  calculateEntropy(word) {
    if (word.length <= 1) return 0;
    const counts = {};
    for (let char of word) counts[char] = (counts[char] || 0) + 1;
    let entropy = 0;
    for (let char in counts) {
      const p = counts[char] / word.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Detects if a given text is likely gibberish (e.g. "asdfasdf", "nvkdfhui")
   */
  isGibberish(text) {
    if (!text || text.trim().length === 0) return false;

    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return false;

    let gibberishWordCount = 0;

    for (const word of words) {
      // 1. Allow pure numbers
      if (/^[0-9]+$/.test(word)) continue;
      
      const len = word.length;
      
      // 2. Repeated sequence of characters (e.g. asdfasdf)
      if (len >= 6 && /(.{2,})\1{1,}/.test(word)) {
        gibberishWordCount++;
        continue;
      }

      // 3. Vowel / Consonant ratio checks
      const vowels = word.match(/[aeiouy]/g) || [];
      const consonants = word.match(/[bcdfghjklmnpqrstvwxz]/g) || [];
      const vowelRatio = vowels.length / len;
      const consonantRatio = consonants.length / len;

      if (len > 4 && (vowelRatio === 0 || consonantRatio === 0)) {
        gibberishWordCount++;
        continue;
      }
      
      if (len >= 5 && (vowelRatio > 0.8 || consonantRatio > 0.85)) {
        gibberishWordCount++;
        continue;
      }

      // 4. Consecutive consonants
      const consecutiveConsonants = word.match(/[bcdfghjklmnpqrstvwxz]{5,}/g);
      if (consecutiveConsonants) {
        gibberishWordCount++;
        continue;
      }

      // 5. Entropy check (detects low variation like 'aabaa' or 'asdfasdf')
      const entropy = this.calculateEntropy(word);
      if (len > 5 && entropy < 1.2) {
         gibberishWordCount++;
         continue;
      }
      
      // 6. Basic keyboard smash patterns
      if (/(qwe|asd|zxc|wer|sdf|xcv|rty|fgh|vbn|jkl)/i.test(word) && len >= 6) {
         gibberishWordCount++;
         continue;
      }
    }

    return (gibberishWordCount / words.length) >= 0.5;
  }
}

module.exports = new GibberishDetector();
