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
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    // Emojis could be handled here or removed. We'll keep it simple: just remove non-word chars except spaces
    normalized = normalized.replace(/[^\w\s]/gi, '');
    return normalized.trim();
  }
}

module.exports = Normalizer;
