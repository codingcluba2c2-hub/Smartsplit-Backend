const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Papa = require('papaparse');

class DocumentParser {
  /**
   * Parses the raw buffer of a document and extracts text.
   * @param {Buffer} buffer 
   * @param {string} mimeType 
   * @param {string} fileName 
   * @returns {Promise<string>}
   */
  async parse(buffer, mimeType, fileName) {
    try {
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        return await this.parsePdf(buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.toLowerCase().endsWith('.docx')
      ) {
        return await this.parseDocx(buffer);
      } else if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        return await this.parseCsv(buffer);
      } else if (mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md')) {
        return buffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported file type: ${mimeType} for file ${fileName}`);
      }
    } catch (error) {
      console.error(`Error parsing document ${fileName}:`, error);
      throw new Error(`Failed to parse document: ${error.message}`);
    }
  }

  async parsePdf(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  async parseDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  async parseCsv(buffer) {
    const csvText = buffer.toString('utf-8');
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Convert CSV rows into a readable format for the LLM
          const text = results.data.map(row => 
            Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
          ).join('\n');
          resolve(text);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
}

module.exports = new DocumentParser();
