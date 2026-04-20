const express = require('express');
const router = express.Router();
const { 
  registerUser, loginUser, getMe, googleLogin, 
  verifyEmail, resendOTP, updateProfile, 
  requestPasswordResetOTP, verifyPasswordResetOTP,
  forgotPassword, verifyForgotPasswordOTP, resetPassword,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);
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
