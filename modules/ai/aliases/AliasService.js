const aliasRepo = require('../repositories/AliasRepository');

class AliasService {
  constructor() {
    this.aliasMap = {};
    this.isLoaded = false;
  }

  async loadAliases() {
    try {
      const activeAliases = await aliasRepo.getAllActive();
      this.aliasMap = {};
      for (const alias of activeAliases) {
        for (const syn of alias.synonyms) {
          this.aliasMap[syn.toLowerCase()] = alias.canonicalConcept.toLowerCase();
        }
      }
      this.isLoaded = true;
      console.log(`[AliasService] Loaded ${Object.keys(this.aliasMap).length} aliases from MongoDB`);
    } catch (error) {
      console.error('[AliasService] Failed to load aliases from MongoDB:', error);
      // Fallback to static if DB fails during startup
      this.aliasMap = {
        'expanse': 'expense', 'expnse': 'expense', 'bill': 'expense', 'payment': 'expense',
        'grp': 'group', 'groop': 'group'
      };
      this.isLoaded = true;
    }
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
