/**
 * TraceSanitizer
 * Masks sensitive enterprise data (JWTs, API Keys, Passwords) before storing traces.
 */
class TraceSanitizer {
  sanitize(data) {
    if (!data) return data;
    
    let stringified = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Mask typical secrets
    stringified = stringified.replace(/(ey[a-zA-Z0-9_-]{10,}.[a-zA-Z0-9_-]{10,}.[a-zA-Z0-9_-]{10,})/g, '[REDACTED_JWT]');
    stringified = stringified.replace(/(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED_API_KEY]');
    stringified = stringified.replace(/("password":\s*")([^"]+)(")/g, '$1[REDACTED_PASSWORD]$3');

    try {
      return JSON.parse(stringified);
    } catch {
      return stringified;
    }
  }
}

module.exports = new TraceSanitizer();