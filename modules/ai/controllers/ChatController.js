const AIPipelineService = require('../services/AIPipelineService');

class ChatController {
  
  async chat(req, res) {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user ? req.user._id : 'anonymous'; // Requires auth middleware

      const result = await AIPipelineService.processMessage(userId, sessionId, message);
      return res.json(result);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
  }

  async stream(req, res) {
    // SSE streaming endpoint (architecture shell)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { message, sessionId } = req.body;
    
    res.write('data: {"status": "processing"}\n\n');
    
    try {
      const result = await AIPipelineService.processMessage('anonymous', sessionId, message);
      // Simulate chunking for stream
      const chunks = result.response.split(' ');
      for (let i = 0; i < chunks.length; i++) {
        res.write(`data: {"token": "${chunks[i]} "}\n\n`);
        await new Promise(r => setTimeout(r, 50));
      }
      res.write('data: {"done": true}\n\n');
      res.end();
    } catch (e) {
      res.write(`data: {"error": "${e.message}"}\n\n`);
      res.end();
    }
  }
}
module.exports = new ChatController();