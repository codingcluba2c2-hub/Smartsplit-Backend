const rateLimit = require('express-rate-limit');

// General login rate limiter (max 5 failed attempts per IP for password, but we also use account lock)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});

// OTP generation rate limiter
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again later'
  }
});

module.exports = {
  loginLimiter,
  otpLimiter
};
