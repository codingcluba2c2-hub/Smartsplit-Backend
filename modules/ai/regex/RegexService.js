class RegexService {
  constructor() {
    this.patterns = {
      'Email': /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      'Phone': /\+?[0-9]{10,14}/g,
      'Amount': /(?:rs|inr|₹|\$|usd)\s?\d+(?:\.\d+)?|\d+(?:\.\d+)?\s?(?:rs|inr|₹|\$|usd)/gi,
      'UPI': /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g
    };
  }

  match(text) {
    const matches = [];
    for (const [entity, regex] of Object.entries(this.patterns)) {
      const found = text.match(regex);
      if (found) {
        matches.push({ entity, values: found });
      }
    }
    return matches;
  }
}

module.exports = new RegexService();
