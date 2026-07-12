class Formatter {
  /**
   * Applies specific markdown/UI formatting depending on the responseType
   */
  static format(compiledText, responseType, rawData = {}) {
    switch (responseType) {
      case 'Markdown':
        return this._formatMarkdown(compiledText);
      case 'List':
        return this._formatList(compiledText, rawData.listItems);
      case 'Table':
        return this._formatTable(compiledText, rawData.tableData);
      case 'Card':
        return this._formatCard(compiledText, rawData.actions);
      case 'Text':
      default:
        return compiledText;
    }
  }

  static _formatMarkdown(text) {
    // Add any global markdown styling rules here
    return text;
  }

  static _formatList(headerText, items = []) {
    if (!items || items.length === 0) return headerText;
    const listMarkdown = items.map(item => `• ${item}`).join('\n');
    return `${headerText}\n\n${listMarkdown}`;
  }

  static _formatTable(headerText, data = []) {
    // Basic markdown table generation
    if (!data || data.length === 0) return headerText;
    const keys = Object.keys(data[0]);
    let tableStr = `| ${keys.join(' | ')} |\n`;
    tableStr += `| ${keys.map(() => '---').join(' | ')} |\n`;
    for (const row of data) {
      tableStr += `| ${keys.map(k => row[k]).join(' | ')} |\n`;
    }
    return `${headerText}\n\n${tableStr}`;
  }

  static _formatCard(text, actions = []) {
    // Return a special JSON structure if the frontend supports cards
    // Or just append markdown links as action buttons
    if (!actions || actions.length === 0) return text;
    const actionLinks = actions.map(a => `[${a.label}](${a.url})`).join(' | ');
    return `${text}\n\n**Actions:**\n${actionLinks}`;
  }
}

module.exports = Formatter;
