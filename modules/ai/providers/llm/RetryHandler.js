class RetryHandler {
  static async executeWithRetry(operation, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        console.log(`[RetryHandler] Attempt ${attempt} failed: ${error.message}`);
        
        // Don't retry client errors (400) except 429 (Rate Limit)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        if (attempt >= maxRetries) throw error;
        
        // Exponential backoff with jitter: 2s, 4s, 8s...
        const backoffBase = 2000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        const delay = backoffBase + jitter;
        
        console.log(`[RetryHandler] Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
module.exports = RetryHandler;