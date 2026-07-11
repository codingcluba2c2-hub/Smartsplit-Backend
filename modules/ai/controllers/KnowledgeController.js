const KnowledgeService = require('../services/KnowledgeService');

class KnowledgeController {
  async getDashboardData(req, res) {
    try {
      const data = await KnowledgeService.getDashboardData();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getDocuments(req, res) {
    try {
      const { skip = 0, limit = 50, ...query } = req.query;
      const docs = await KnowledgeService.getDocuments(query, parseInt(skip), parseInt(limit));
      res.json({ success: true, data: docs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      
      const docData = {
        title: req.body.title || req.file.originalname,
        type: req.body.type || 'TXT',
        category: req.body.category || 'Uncategorized',
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype
      };

      const doc = await KnowledgeService.uploadDocument(docData, req.user);
      res.json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getDocumentDetails(req, res) {
    try {
      const details = await KnowledgeService.getDocumentDetails(req.params.id);
      res.json({ success: true, data: details });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteDocument(req, res) {
    try {
      await KnowledgeService.deleteDocument(req.params.id);
      res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async searchPreview(req, res) {
    try {
      const results = await KnowledgeService.searchPreview(req.body.query);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new KnowledgeController();