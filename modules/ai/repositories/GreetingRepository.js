const Greetings = require('../models/Greetings');

class GreetingRepository {
  async getAllActive() {
    return Greetings.find({ isActive: true }).lean();
  }
}

module.exports = new GreetingRepository();
