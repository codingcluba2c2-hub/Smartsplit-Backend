const express = require('express');
const router = express.Router();
const { 
  registerUser, loginUser, getMe, googleLogin, 
  verifyEmail, resendOTP, updateProfile, 
  requestPasswordResetOTP, verifyPasswordResetOTP,
  forgotPassword, verifyForgotPasswordOTP, resetPassword,
  changePassword, refreshToken, logoutUser,
  sendLoginOTP, verifyLoginOTP
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { loginLimiter, otpLimiter } = require('../middlewares/rateLimiter');

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/send-login-otp', otpLimiter, sendLoginOTP);
router.post('/verify-login-otp', loginLimiter, verifyLoginOTP);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.post('/google-login', loginLimiter, googleLogin);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/request-password-otp', protect, requestPasswordResetOTP);
router.post('/verify-password-otp', protect, verifyPasswordResetOTP);

// Forgot Password (Public Routes)
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOTP);
router.post('/reset-password', resetPassword);

// Change Password (Protected Route)
router.post('/change-password', protect, changePassword);

module.exports = router;
