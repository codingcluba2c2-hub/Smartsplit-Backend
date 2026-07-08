const User = require('../models/User');

const appOwnerMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin' || !user.isAppOwner) {
      return res.status(403).json({ message: 'Access denied. App Owner role required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = appOwnerMiddleware;
