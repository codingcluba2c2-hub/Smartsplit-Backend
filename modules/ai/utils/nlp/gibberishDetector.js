class GibberishDetector {
  /**
   * Detects if a given text is likely gibberish (e.g. "jkhficnvbw")
   * Uses consecutive consonants and vowel/consonant ratios.
   * @param {string} text 
   * @returns {boolean} true if gibberish
   */
  isGibberish(text) {
    if (!text || text.trim().length === 0) return false;

    // Remove whitespace and non-alphabetic characters for analysis
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) return false;

    let gibberishWordCount = 0;

    for (const word of words) {
      // 1. Check for consecutive consonants (5 or more is highly likely gibberish in English)
      const consecutiveConsonants = word.match(/[bcdfghjklmnpqrstvwxyz]{5,}/g);
      if (consecutiveConsonants) {
        gibberishWordCount++;
        continue;
      }

      // 2. Check for words that are entirely consonants but longer than allowed exceptions (like "rhythm" or "hmm")
      // We'll set the threshold to > 4 to allow short abbreviations
      const hasVowel = /[aeiouy]/.test(word);
      if (!hasVowel && word.length > 4) {
        gibberishWordCount++;
        continue;
      }

      // 3. Same character repeated 4 or more times (e.g. "aaaaa", "hhhh")
      const sameCharRepeated = /(.)\1{3,}/.test(word);
      if (sameCharRepeated) {
        gibberishWordCount++;
        continue;
      }
    }

    // If more than 50% of the words are gibberish (or if there's only 1 word and it's gibberish), flag the whole text.
    return (gibberishWordCount / words.length) >= 0.5;
  }
}

module.exports = new GibberishDetector();
