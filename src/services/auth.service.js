const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { signToken } = require('../utils/token.utils');

const createUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({ name, email, password });
  return user;
};

const validateUserCredentials = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  return user;
};

const generateAuthToken = (userId) => signToken(userId);

module.exports = {
  createUser,
  validateUserCredentials,
  generateAuthToken,
};
