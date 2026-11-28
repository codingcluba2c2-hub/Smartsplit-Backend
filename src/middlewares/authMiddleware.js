const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.cookies.accessToken;

  // Fallback for development/testing if header is explicitly provided
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch latest user from DB to ensure they haven't been deleted or roles changed
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    if (req.user.isDeleted) {
      return res.status(401).json({ message: 'Your account has been deactivated.' });
    }
    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the administrator.' });
    }

    // Update lastSeen (throttled to once per 60s) for accurate presence across HTTP & serverless
    const now = Date.now();
    if (!req.user.lastSeen || now - new Date(req.user.lastSeen).getTime() > 60000) {
      User.updateOne({ _id: req.user._id }, { $set: { lastSeen: new Date(now) } }).catch(() => {});
    }
    
    next();
  } catch (error) {
    console.error('JWT Verification error:', error.message);
    res.status(401).json({ message: 'Not authorized, token failed or expired' });
  }
};

module.exports = { protect };
