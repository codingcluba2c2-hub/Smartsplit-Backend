const { io } = require('socket.io-client');
const mongoose = require('mongoose');
require('dotenv').config();

const socket = io('http://localhost:5000');

socket.on('connect', async () => {
  console.log('Socket connected:', socket.id);
  
  await mongoose.connect(process.env.MONGODB_URI);
  const AIPipelineService = require('./modules/ai/services/AIPipelineService');
  await AIPipelineService.processMessage('anonymous', 'test-session', 'hello socket');
  mongoose.disconnect();
});

socket.on('trace:started', (data) => {
  console.log('RECEIVED trace:started', data.traceId);
});

socket.on('trace:stage', (data) => {
  console.log('RECEIVED trace:stage', data.stage.stage);
});

setTimeout(() => {
  console.log('Timeout. Exiting.');
  process.exit(0);
}, 5000);
