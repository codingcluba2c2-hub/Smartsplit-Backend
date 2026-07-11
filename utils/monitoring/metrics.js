const promClient = require('prom-client');

// Initialize the default metrics registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom AI Metrics
const llmTokenUsage = new promClient.Counter({
  name: 'smartsplit_ai_llm_tokens_total',
  help: 'Total number of tokens consumed by the LLM',
  labelNames: ['model', 'type']
});

const ragHitRate = new promClient.Counter({
  name: 'smartsplit_ai_rag_hits_total',
  help: 'Total number of successful Knowledge Base retrievals'
});

const requestLatency = new promClient.Histogram({
  name: 'smartsplit_api_request_duration_seconds',
  help: 'Duration of API requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(llmTokenUsage);
register.registerMetric(ragHitRate);
register.registerMetric(requestLatency);

const metricsMiddleware = async (req, res, next) => {
  if (req.path === '/metrics') {
    res.set('Content-Type', register.contentType);
    return res.end(await register.metrics());
  }
  
  const end = requestLatency.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
  });
  next();
};

module.exports = {
  metricsMiddleware,
  llmTokenUsage,
  ragHitRate
};