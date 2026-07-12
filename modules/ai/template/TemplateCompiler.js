class TemplateCompiler {
  /**
   * Replaces placeholders like {{variableName}} in the template string
   * with actual values from the variables object.
   */
  static compile(templateString, variablesData) {
    if (!templateString) return '';
    
    return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, variableName) => {
      // If the variable exists in our data, replace it. Otherwise, keep the placeholder or return empty.
      if (variablesData[variableName] !== undefined && variablesData[variableName] !== null) {
        return variablesData[variableName];
      }
      return match; // Leave un-resolved variables visible for debugging, or return '' to hide them
    });
  }
}

module.exports = TemplateCompiler;
