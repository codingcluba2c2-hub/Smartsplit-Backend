/**
 * OCRService
 * Extracts text from images and scanned documents.
 */
class OCRService {
  async extractText(imageBuffer) {
    console.log('[OCRService] Extracting text from image...');
    // Placeholder for Tesseract.js or Cloud Vision API
    return "MOCK_RECEIPT: Total Amount: $45.20, Merchant: Starbucks, Date: 2023-10-15";
  }

  async detectFields(extractedText) {
    // Example regex or LLM-based field extraction
    return {
      amount: "$45.20",
      merchant: "Starbucks",
      date: "2023-10-15"
    };
  }
}

module.exports = new OCRService();