const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration',
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    req.userId = decoded.userId;
    next();
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';

    return res.status(401).json({
      success: false,
      message: isProd ? 'Unauthorized' : error.message,
    });
  }
};

module.exports = authMiddleware;
