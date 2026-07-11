const Alias = require('../models/Aliases');

class AliasRepository {
  async getAllActive() {
    return Alias.find({ isActive: true }).lean();
  }
}

module.exports = new AliasRepository();
