const IntentResult = require('../dto/IntentResult');

class GreetingService {
  constructor() {
    this.greetings = {
      'hi': 'Hello! How can I help you today?',
      'hello': 'Hi there! How can I assist you?',
      'hey': 'Hey! What can I do for you?',
      'good morning': 'Good morning! Ready to manage some expenses?',
      'good afternoon': 'Good afternoon! How can I help?',
      'good evening': 'Good evening! Need help with settlements?',
      'good night': 'Good night! See you tomorrow.',
      'how are you': 'I am just a bot, but I am doing great! How about you?',
      'thanks': 'You are welcome!',
      'thank you': 'My pleasure!',
      'bye': 'Goodbye! Have a great day!',
      'see you': 'See you later!',
      'welcome': 'Glad to be here!',
      'sorry': 'No worries at all!'
    };
  }

  detect(text) {
    if (this.greetings[text]) {
      const result = new IntentResult('Greeting', 98, 'Greeting Matched');
      result.payload = this.greetings[text];
      return result;
    }
    return new IntentResult('Unknown', 0, 'No Greeting match');
  }
}

module.exports = new GreetingService();
