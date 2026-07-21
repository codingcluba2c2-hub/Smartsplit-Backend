const mongoose = require('mongoose');
const AIPipelineService = require('./modules/ai/services/AIPipelineService');
const AIExecutionTrace = require('./modules/ai/models/AIExecutionTrace');
require('dotenv').config();

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const result = await AIPipelineService.processMessage('anonymous', 'session-123', 'create group');
    console.log('API Result:', JSON.stringify(result, null, 2));

    const traceId = result.debug.traceId;
    console.log('Returned traceId:', traceId);

    const dbTrace = await AIExecutionTrace.findOne({}).sort({ createdAt: -1 }).lean();
    if (!dbTrace) {
      console.log('NO TRACE FOUND IN DB!');
      return;
    }

    console.log('Latest DB Trace pipeline length:', dbTrace.pipeline.length);
    console.log('Stages:', dbTrace.pipeline.map(p => p.stage).join(' -> '));
    console.log('Gemini Called:', dbTrace.geminiCalled);
    console.log('Total Latency:', dbTrace.latency);
    
    // Check missing fields in first stage
    const firstStage = dbTrace.pipeline[0];
    console.log('First Stage fields:', Object.keys(firstStage));

  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

runTest();
