const notificationGenerator = require('./NotificationGenerator');

/**
 * ProactiveEngine
 * Runs background cron jobs to analyze user data and generate proactive insights.
 */
class ProactiveEngine {
  async runDailyAnalysis(userId) {
    console.log(`[ProactiveEngine] Running daily analysis for user ${userId}...`);
    
    // Example insights found during analysis
    const insights = [
      { type: 'pending_settlements', count: 3, message: "You have 3 pending settlements." },
      { type: 'budget_alert', message: "Your monthly spending increased 24%." }
    ];

    if (insights.length > 0) {
      for (const insight of insights) {
        await notificationGenerator.generateAndSend(userId, insight);
      }
    }
  }

  // Placeholder for node-cron setup
  startCronJobs() {
    console.log('[ProactiveEngine] Cron jobs started.');
  }
}

module.exports = new ProactiveEngine();