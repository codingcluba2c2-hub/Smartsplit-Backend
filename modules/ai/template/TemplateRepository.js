const ResponseTemplates = require('../models/ResponseTemplates');

class TemplateRepository {
  async getActiveTemplatesByIntent(intent) {
    return ResponseTemplates.find({ 
      intent, 
      status: 'Active' 
    }).sort({ priority: -1 }).lean();
  }

  async getActiveTemplatesByTriggerType(triggerType) {
    return ResponseTemplates.find({ 
      triggerType, 
      status: 'Active' 
    }).sort({ priority: -1 }).lean();
  }

  async recordUsage(templateId) {
    return ResponseTemplates.findByIdAndUpdate(
      templateId,
      { 
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: Date.now() }
      }
    );
  }
}

module.exports = new TemplateRepository();
