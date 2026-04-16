const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP } = require('../services/emailService');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
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
    
    // Generate and send OTP
    const otpCode = generateOTP();
    await OTP.create({ email, otp: otpCode });
    
    try {
      await sendOTP(email, otpCode);
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
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = true;
    await user.save();
    
    // Delete OTP record after verification
    await OTP.deleteMany({ email });

    const avatar = resolveAvatar(user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified' });

    const otpCode = generateOTP();
    await OTP.deleteMany({ email }); // Delete old OTPs
    await OTP.create({ email, otp: otpCode });

    await sendOTP(email, otpCode);
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
      if (!user.isVerified && !user.googleId) {
        return res.status(403).json({ 
          message: 'Please verify your email to login', 
          requiresVerification: true,
          email: user.email
        });
      }

      const avatar = resolveAvatar(user);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar,
        token: generateToken(user._id)
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
      // Update googleId if not present
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
      });
    }

    const avatar = resolveAvatar(user);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar,
      mobile: user.mobile || '',
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, mobile, avatar } = req.body;
    
    if (name) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    
    if (avatar) {
      if (avatar.startsWith('data:image')) {
        const imageUrl = await uploadToCloudinary(avatar);
        user.avatar = imageUrl;
      } else {
        user.avatar = avatar;
      }
    }

    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: resolveAvatar(updatedUser),
      mobile: updatedUser.mobile,
      token: generateToken(updatedUser._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.requestPasswordResetOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otpCode = generateOTP();
    await OTP.deleteMany({ email: user.email });
    await OTP.create({ email: user.email, otp: otpCode });

    await sendOTP(user.email, otpCode);
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

    const otpRecord = await OTP.findOne({ email: user.email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    user.password = newPassword;
    await user.save();
    
    await OTP.deleteMany({ email: user.email });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
