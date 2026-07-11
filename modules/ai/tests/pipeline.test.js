const pipeline = require('../services/AIPipelineService');

async function runTests() {
  const tests = [
    'hello',
    'helo',
    'hii',
    'hy',
    'good mrng',
    'what is SmartSplit',
    'how to create group',
    'how do i create expense',
    'how can i add payment',
    'how to settle',
    'show help',
    'thank you',
    'bye',
    'what is my balance 250 rs'
  ];

  console.log('--- STARTING AI PIPELINE TESTS ---\n');
  
  for (const t of tests) {
    const res = await pipeline.processMessage('user123', 'session123', t);
    console.log(`[User] : ${t}`);
    console.log(`[Bot]  : ${res.response}`);
    console.log(`[Debug]: Intent: ${res.debug.intent} (${res.debug.confidence}%) | Normalized: ${res.debug.normalizedText}`);
    if (res.debug.matchedRegex.length > 0) {
      console.log(`         Regex Found: ${JSON.stringify(res.debug.matchedRegex)}`);
    }
    console.log('----------------------------------------------------');
  }
}

runTests().catch(console.error);
