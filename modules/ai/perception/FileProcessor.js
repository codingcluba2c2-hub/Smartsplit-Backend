const ocrService = require('./OCRService');

/**
 * FileProcessor
 * Handles file uploads, detects type, and delegates to parsers/OCR.
 */
class FileProcessor {
  async process(fileBuffer, mimeType) {
    console.log(`[FileProcessor] Processing file of type ${mimeType}...`);
    
    if (mimeType.includes('image')) {
      const text = await ocrService.extractText(fileBuffer);
      const fields = await ocrService.detectFields(text);
      return { type: 'image', content: text, metadata: fields };
    }
    
    if (mimeType === 'application/pdf') {
      // PDF Parsing logic here
      return { type: 'pdf', content: "Mock PDF Content" };
    }
    
    if (mimeType === 'text/csv') {
      // CSV Parsing logic here
      return { type: 'csv', content: "Mock CSV Content" };
    }

    return { type: 'unknown', content: "" };
  }
}

module.exports = new FileProcessor();