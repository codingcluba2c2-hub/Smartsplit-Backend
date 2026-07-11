/**
 * NotificationGenerator
 * Uses the LLM to draft personalized notification text based on hard data.
 */
class NotificationGenerator {
  async generateAndSend(userId, insight) {
    console.log(`[NotificationGenerator] Drafting notification for insight: ${insight.type}`);
    
    // In production, this would call the LLMRouter to generate a human-friendly message.
    // e.g., "Hey Akhlaque! Just a quick heads up, you have 3 pending settlements waiting."
    
    const draft = `Hey! Just a heads up: ${insight.message}`;
    
    // Send to push notification service, email, or in-app bell
    console.log(`[NotificationGenerator] Sent to user ${userId}: ${draft}`);
  }
}

module.exports = new NotificationGenerator();