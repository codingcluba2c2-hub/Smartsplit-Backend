const TemplateMatcher = require('./TemplateMatcher');
const PlaceholderResolver = require('./PlaceholderResolver');
const TemplateCompiler = require('./TemplateCompiler');
const Formatter = require('./Formatter');
const templateRepo = require('./TemplateRepository');

class TemplateEngine {
  /**
   * Orchestrates the response generation pipeline.
   * Intercepts data and attempts to generate a response without LLM.
   */
  static async generate(intent, triggerType, contextData = {}) {
    // 1. Find Matching Template
    const templateDoc = await TemplateMatcher.match(intent, triggerType);
    
    if (!templateDoc) {
      return { success: false, reason: 'No template matched' };
    }

    try {
      // 2. Resolve Variables
      const resolvedVariables = await PlaceholderResolver.resolve(templateDoc.variables || [], contextData);

      // 3. Compile String
      const compiledText = TemplateCompiler.compile(templateDoc.template, resolvedVariables);

      // 4. Format Output (Markdown, Table, etc.)
      const finalResponse = Formatter.format(compiledText, templateDoc.responseType, contextData);

      // 5. Analytics/Usage Tracking
      await templateRepo.recordUsage(templateDoc._id);

      return {
        success: true,
        response: finalResponse,
        templateUsed: templateDoc.name
      };
    } catch (e) {
      console.error('[TemplateEngine] Generation failed:', e);
      return { success: false, reason: 'Template compilation failed' };
    }
  }
}

module.exports = TemplateEngine;
