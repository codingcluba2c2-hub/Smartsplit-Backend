const AIPipelineService = require('../services/AIPipelineService');

async function runLLMTests() {
  const tests = [
    'What is my balance?',
    'How much have I spent this month?'
  ];

  console.log('--- STARTING LLM & TOOL TESTS ---\n');
  
  for (const t of tests) {
    const res = await AIPipelineService.processMessage('user123', 'session123', t);
    console.log(`[User] : ${t}`);
    console.log(`[Bot]  : ${res.response}`);
    console.log(`[Debug]: Intent: ${res.debug.intent} | Tools Executed: ${res.debug.toolsExecuted}`);
    console.log('----------------------------------------------------');
  }
}

runLLMTests().catch(console.error);