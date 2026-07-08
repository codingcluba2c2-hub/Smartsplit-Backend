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
    
    next();
  } catch (error) {
    console.error('JWT Verification error:', error.message);
    res.status(401).json({ message: 'Not authorized, token failed or expired' });
  }
};

module.exports = { protect };
