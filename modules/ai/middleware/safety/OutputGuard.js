class OutputGuard {
  static sanitize(text) {
    if (!text) return text;
    // Strip potential leaked secrets (naive regex for demo)
    let safeText = text.replace(/sk-[a-zA-Z0-9]{32,}/g, "[REDACTED API KEY]");
    // Block internal DB structure leaks
    if (safeText.includes('mongoose.Schema')) {
       return "I cannot provide internal system details.";
    }
    return safeText;
  }
}
module.exports = OutputGuard;