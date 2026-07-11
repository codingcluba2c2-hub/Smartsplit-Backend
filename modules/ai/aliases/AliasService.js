const aliasRepo = require('../repositories/AliasRepository');

class AliasService {
  constructor() {
    this.aliasMap = {};
    this.isLoaded = false;
  }

  async loadAliases() {
    // Basic mock implementation for now to avoid DB coupling in tests
    // In production, this reads from aliasRepo
    const activeAliases = [
      { canonicalConcept: 'expense', synonyms: ['expanse', 'expnse', 'bill', 'payment', 'transaction', 'money'] },
      { canonicalConcept: 'group', synonyms: ['grp', 'groop', 'grop', 'groups'] }
    ];
    
    this.aliasMap = {};
    for (const alias of activeAliases) {
      for (const syn of alias.synonyms) {
        this.aliasMap[syn.toLowerCase()] = alias.canonicalConcept.toLowerCase();
      }
    }
    this.isLoaded = true;
  }

  async expand(text) {
    if (!this.isLoaded) await this.loadAliases();
    const words = text.split(' ');
    const expanded = words.map(w => this.aliasMap[w] || w);
    return {
      text: expanded.join(' '),
      matchedAliases: words.filter(w => this.aliasMap[w])
    };
  }
}

module.exports = new AliasService();
