class RetryHandler {
  static async executeWithRetry(operation, maxRetries = 2) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        console.log(`[RetryHandler] Attempt ${attempt} failed: ${error.message}`);
        
        // Don't retry 404 or client errors (except 429 rate limits)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        if (attempt >= maxRetries) throw error;
        
        const delay = 500 * attempt;
        console.log(`[RetryHandler] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
module.exports = RetryHandler;