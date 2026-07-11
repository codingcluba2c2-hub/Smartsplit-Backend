const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// AI-specific prompt injection protection (basic heuristic)
const promptInjectionGuard = (req, res, next) => {
  if (req.body && req.body.prompt) {
    const dangerousPatterns = [/ignore previous instructions/i, /system prompt/i, /bypass/i];
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(req.body.prompt));
    if (isDangerous) {
      return res.status(403).json({ error: 'Security Exception: Prompt injection detected.' });
    }
  }
  next();
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const securityGuard = [
  helmet(), // Sets various HTTP headers for security (CSP, HSTS, etc.)
  mongoSanitize(), // Prevents NoSQL injection
  xss(), // Prevents Cross-Site Scripting
  apiLimiter, // API Throttling
  promptInjectionGuard // AI Security
];

module.exports = securityGuard;