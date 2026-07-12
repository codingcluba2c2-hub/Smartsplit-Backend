const templateRepo = require('./TemplateRepository');

class TemplateMatcher {
  /**
   * Finds the most appropriate template for the given intent and trigger type.
   */
  static async match(intent, triggerType) {
    let templates = [];
    
    // 1. Try to match by explicit Intent first
    if (intent && intent !== 'Unknown') {
      templates = await templateRepo.getActiveTemplatesByIntent(intent);
    }
    
    // 2. Fallback to TriggerType (e.g. 'Knowledge' fallback)
    if (templates.length === 0 && triggerType) {
      templates = await templateRepo.getActiveTemplatesByTriggerType(triggerType);
    }
    
    // If we have templates, the repository already sorted them by priority DESC.
    // Return the highest priority one.
    if (templates.length > 0) {
      return templates[0];
    }
    
    return null;
  }
}

module.exports = TemplateMatcher;
