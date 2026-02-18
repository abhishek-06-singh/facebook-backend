const jwt = require('jsonwebtoken');

const signToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
};

module.exports = {
  signToken,
};
