const IntentResult = require('../dto/IntentResult');
const greetingRepo = require('../repositories/GreetingRepository');

const AIEventBus = require('../events/AIEventBus');

class GreetingService {
  constructor() {
    this.greetings = {};
    this.isLoaded = false;
    this._version = 1;

    AIEventBus.on('rules:greeting:updated', () => {
      console.log('[GreetingService] Event received: rules:greeting:updated. Reloading...');
      this._version++;
      this.loadGreetings();
    });
  }

  getVersion() {
    return `v${this._version}`;
  }

  async loadGreetings() {
    try {
      const activeGreetings = await greetingRepo.getAllActive();
      this.greetings = {};
      for (const greeting of activeGreetings) {
        // If there are multiple responses, pick a random one, or store all and pick random at runtime
        this.greetings[greeting.trigger.toLowerCase()] = greeting.responses;
      }
      this.isLoaded = true;
      console.log(`[GreetingService] Loaded ${Object.keys(this.greetings).length} greetings from MongoDB`);
    } catch (err) {
      console.error('[GreetingService] Failed to load greetings:', err);
      // Fallback
      this.greetings = {
        'hi': ['Hello! How can I help you today?'],
        'hello': ['Hi there! How can I assist you?']
      };
      this.isLoaded = true;
    }
  }

  async detect(text) {
    if (!this.isLoaded) await this.loadGreetings();
    
    const cleanText = (text || '').trim().toLowerCase();
    if (this.greetings[cleanText]) {
      const responses = this.greetings[cleanText];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const result = new IntentResult('Greeting', 0.98, 'Greeting Matched');
      result.payload = randomResponse;
      return result;
    }

    if (/^(hi|hello|hy|hey|hola|greetings|good morning|good afternoon|good evening|who are you|what can you do)[\s!.]*$/i.test(cleanText)) {
      const responses = [
        "Hello! Welcome to **SmartSplit AI**. How can I help you manage your expenses today?",
        "Hi there! I'm **SmartSplit AI**. How can I assist you with balances, groups, or settlements?",
        "Hey! How can I help you with your SmartSplit account today?"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const result = new IntentResult('Greeting', 0.98, 'Greeting Matched');
      result.payload = randomResponse;
      return result;
    }

    return new IntentResult('Unknown', 0, 'No Greeting match');
  }
}

module.exports = new GreetingService();
