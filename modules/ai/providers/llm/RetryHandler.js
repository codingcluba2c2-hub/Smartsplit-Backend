class RetryHandler {
  static async executeWithRetry(operation, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        console.log(`[RetryHandler] Attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxRetries) throw error;
        // Basic exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
}
module.exports = RetryHandler;