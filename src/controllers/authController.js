const User = require('../models/User');
const OTP = require('../models/OTP');
const Notification = require('../models/Notification');
const LoginLog = require('../models/LoginLog');
const useragent = require('useragent');
const { sendOTP } = require('../services/emailService');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const logLogin = async (req, user) => {
  try {
    const agent = useragent.parse(req.headers['user-agent']);
    // req.ip will contain the real client IP when trust proxy is enabled
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    await LoginLog.create({
      userId: user._id,
      username: user.name,
      email: user.email,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: {
        browser: agent.toAgent(),
        os: agent.os.toString(),
        device: agent.device.toString()
      }
    });
  } catch (error) {
    console.error('Failed to log login:', error);
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' }); // Short-lived access token
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' }); // Long-lived refresh token
};

const Session = require('../models/Session');
const crypto = require('crypto');

const setAuthCookies = async (res, req, userId) => {
  const accessToken = generateToken(userId);
  const refreshToken = generateRefreshToken(userId);
  
  // Hash refresh token for DB storage
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  const agent = useragent.parse(req.headers['user-agent']);
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Create new session
  await Session.create({
    user: userId,
    refreshToken: hashedToken,
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
    device: agent.device.toString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  // Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const getAvatarUrl = (name) => {
  // Ensures the initials are derived from the actual name, avoiding the 'US' (User) default
  const cleanName = name?.trim() || 'Guest';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=6366f1&color=fff&bold=true&format=svg`;
};

const resolveAvatar = (user) => {
  if (!user?.avatar || user.avatar.includes('name=User')) {
    return getAvatarUrl(user.name);
  }
  return user.avatar;
};

exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password });
    
    // Set admin role for specific email
    if (email === 'akhlaquerahman18@gmail.com') {
      user.role = 'admin';
      await user.save();
    }
    
    // Generate and send OTP
    const otpCode = generateOTP();
    const cleanEmail = email.trim().toLowerCase();
    await OTP.deleteMany({ email: cleanEmail }); // Always delete old OTP records before creating new one
    await OTP.create({ email: cleanEmail, otp: otpCode });
    
    try {
      await sendOTP(cleanEmail, otpCode);
      res.status(201).json({
        message: 'Registration successful. Please verify your email with the OTP sent.',
        email: user.email,
        requiresVerification: true
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(201).json({
        message: 'Registration successful but failed to send verification email. Please try resending OTP.',
        email: user.email,
        requiresVerification: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = true;
    await user.save();

    // Create system notification for new user registration
    await Notification.create({
      title: 'New User Registered',
      message: `User ${user.name} (${user.email}) has registered and verified their email.`,
      type: 'success',
      targetId: user._id,
      targetModel: 'User',
      recipientRole: 'admin'
    });
    
    // Delete OTP record after verification
    await OTP.deleteMany({ email: cleanEmail });

    const avatar = resolveAvatar(user);
    
    await setAuthCookies(res, req, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar,
      profilePicture: user.profilePicture || avatar,
      mobile: user.mobile || '',
      mobileNumber: user.mobileNumber || user.mobile || '',
      upiId: user.upiId || '',
      role: user.role,
      isAppOwner: user.isAppOwner || false,
      authProvider: user.authProvider || 'local',
      isMobileVerified: user.isMobileVerified || false,
      status: user.status || 'active'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified' });

    const otpCode = generateOTP();
    await OTP.deleteMany({ email: cleanEmail }); // Delete old OTPs
    await OTP.create({ email: cleanEmail, otp: otpCode });

    await sendOTP(cleanEmail, otpCode);
    res.json({ message: 'New OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (user && (await user.comparePassword(password, user.password))) {
      if (user.isDeleted) {
        return res.status(401).json({ message: 'Your account has been deactivated.' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked by the administrator. Please contact the administrator to reactivate your account.' });
      }
      if (!user.isVerified && !user.googleId) {
        return res.status(403).json({ 
          message: 'Please verify your email to login', 
          requiresVerification: true,
          email: user.email
        });
      }

      const avatar = resolveAvatar(user);
      
      // Log login activity
      await logLogin(req, user);
      await setAuthCookies(res, req, user._id);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar,
        profilePicture: user.profilePicture || avatar,
        mobile: user.mobile || '',
        mobileNumber: user.mobileNumber || user.mobile || '',
        upiId: user.upiId || '',
        role: user.role,
        isAppOwner: user.isAppOwner || false,
        authProvider: user.authProvider || 'local',
        isMobileVerified: user.isMobileVerified || false,
        status: user.status || 'active'
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  if (req.user) {
    req.user.avatar = resolveAvatar(req.user);
  }
  res.json(req.user);
};

exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (user) {
      if (user.isDeleted) {
        return res.status(401).json({ message: 'Your account has been deactivated.' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked by the administrator. Please contact the administrator to reactivate your account.' });
      }

      // Update googleId if not present
      let isModified = false;
      if (!user.googleId) {
        user.googleId = googleId;
        isModified = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        isModified = true;
      }
      if (picture && (!user.avatar || user.avatar.includes('ui-avatars.com') || user.avatar.includes('name=User'))) {
        user.avatar = picture;
        user.profilePicture = picture;
        isModified = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
        isModified = true;
      }
      if (isModified) {
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        profilePicture: picture,
        authProvider: 'google',
        isVerified: true
      });
      
      // Set admin role for specific email
      if (email === 'akhlaquerahman18@gmail.com') {
        user.role = 'admin';
        await user.save();
      }

      // Create system notification for new user registration (Google signup)
      await Notification.create({
        title: 'New User Registered',
        message: `User ${user.name} (${user.email}) registered using Google OAuth.`,
        type: 'success',
        targetId: user._id,
        targetModel: 'User',
        recipientRole: 'admin'
      });
    }

    const avatar = resolveAvatar(user);

    // Log login activity
    await logLogin(req, user);
    await setAuthCookies(res, req, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar,
      profilePicture: user.profilePicture || avatar,
      mobile: user.mobile || '',
      mobileNumber: user.mobileNumber || user.mobile || '',
      upiId: user.upiId || '',
      role: user.role,
      isAppOwner: user.isAppOwner || false,
      authProvider: user.authProvider || 'local',
      isMobileVerified: user.isMobileVerified || false,
      status: user.status || 'active'
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({ message: error.message || 'Google authentication failed' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, mobile, mobileNumber, upiId, avatar, profilePicture } = req.body;
    
    if (name) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (upiId !== undefined) user.upiId = upiId;
    
    const newAvatar = avatar || profilePicture;
    if (newAvatar) {
      if (newAvatar.startsWith('data:image')) {
        const imageUrl = await uploadToCloudinary(newAvatar);
        user.avatar = imageUrl;
        user.profilePicture = imageUrl;
      } else {
        user.avatar = newAvatar;
        user.profilePicture = newAvatar;
      }
    }

    const updatedUser = await user.save();
    const avatarUrl = resolveAvatar(updatedUser);
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: avatarUrl,
      profilePicture: updatedUser.profilePicture || avatarUrl,
      mobile: updatedUser.mobile,
      mobileNumber: updatedUser.mobileNumber,
      upiId: updatedUser.upiId,
      role: updatedUser.role,
      isAppOwner: updatedUser.isAppOwner || false,
      authProvider: updatedUser.authProvider,
      isMobileVerified: updatedUser.isMobileVerified,
      status: updatedUser.status
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.requestPasswordResetOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cleanEmail = user.email.trim().toLowerCase();
    const otpCode = generateOTP();
    await OTP.deleteMany({ email: cleanEmail });
    await OTP.create({ email: cleanEmail, otp: otpCode });

    await sendOTP(cleanEmail, otpCode);
    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPasswordResetOTP = async (req, res) => {
  const { otp, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cleanEmail = user.email.trim().toLowerCase();
    const cleanOtp = otp ? String(otp).trim() : '';

    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    user.password = newPassword;
    await user.save();
    
    await OTP.deleteMany({ email: cleanEmail });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password (Public Routes)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and send OTP
    const otpCode = generateOTP();
    await OTP.deleteMany({ email: cleanEmail }); // Delete old OTPs
    await OTP.create({ email: cleanEmail, otp: otpCode });

    try {
      await sendOTP(cleanEmail, otpCode);
      res.json({ message: 'Password reset OTP sent to your email' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyForgotPasswordOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP is valid, return success (don't delete yet, will be deleted on password reset)
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update password
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();
    
    // Delete OTP record
    await OTP.deleteMany({ email: cleanEmail });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change Password (Authenticated Route)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Validate new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const session = await Session.findOne({
      user: decoded.id,
      refreshToken: hashedToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Invalidate old session
    session.isRevoked = true;
    await session.save();

    // Generate new tokens and session
    await setAuthCookies(res, req, decoded.id);

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(401).json({ message: 'Refresh token failed or expired' });
  }
};

exports.logoutUser = async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (refreshToken) {
    try {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await Session.findOneAndUpdate(
        { refreshToken: hashedToken },
        { isRevoked: true }
      );
    } catch (e) {
      console.error('Error invalidating session during logout:', e);
    }
  }

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  
  res.json({ message: 'Logged out successfully' });
};
