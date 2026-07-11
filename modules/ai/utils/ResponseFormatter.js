class ResponseFormatter {
  format(intentResult) {
    if (intentResult.intent === 'Database' && intentResult.payload && intentResult.payload.balance) {
      return `Your current balance is ₹${intentResult.payload.balance}.\nYou can see complete details under Dashboard -> Balance.`;
    }
    
    // Fallback to returning the payload if available, else static
    return intentResult.payload || 'Action completed.';
  }
}

module.exports = new ResponseFormatter();
