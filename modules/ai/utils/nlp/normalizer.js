/**
 * NLP Text Normalizer
 * Preprocesses input for the AI pipeline.
 */
class Normalizer {
  static normalize(text) {
    if (!text) return '';
    let normalized = text;
    // Lowercase
    normalized = normalized.toLowerCase();
    // Unicode cleanup (replace diacritics etc.)
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Remove emojis and special non-ASCII unicode
    normalized = normalized.replace(/[^\x00-\x7F]/g, "");
    // Normalize punctuation (keep basic punctuation, remove others)
    normalized = normalized.replace(/[^\w\s.,?!'"-]/g, '');
    // Remove duplicate characters (more than 2 in a row -> 1)
    normalized = normalized.replace(/(.)\1{2,}/g, '$1');
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
  }
}

module.exports = Normalizer;
