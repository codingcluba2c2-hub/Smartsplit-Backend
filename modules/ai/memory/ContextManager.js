class ContextManager {
  constructor() {
    // In-memory mock for now
    this.sessions = {};
  }
  
  getSession(userId, sessionId) {
    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = {
        userId,
        sessionId,
        history: [],
        lastIntent: null
      };
    }
    return this.sessions[sessionId];
  }
  
  updateSession(sessionId, message, intent) {
    if (this.sessions[sessionId]) {
      this.sessions[sessionId].history.push(message);
      if (this.sessions[sessionId].history.length > 10) {
        this.sessions[sessionId].history.shift();
      }
      this.sessions[sessionId].lastIntent = intent;
    }
  }
}

module.exports = new ContextManager();
