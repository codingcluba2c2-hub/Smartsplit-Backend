class InputGuard {
  static sanitize(text) {
    if (!text) return text;
    // Strip script tags, basic XSS prevention
    const sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    
    // Check for prompt injection keywords
    const malicious = ['ignore previous', 'system prompt', 'reveal instructions', 'bypass'];
    for (const word of malicious) {
      if (sanitized.toLowerCase().includes(word)) {
        throw new Error('Security Violation: Prompt Injection Detected');
      }
    }
    return sanitized;
  }
}
module.exports = InputGuard;