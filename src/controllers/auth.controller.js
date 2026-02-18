const asyncHandler = require("../utils/asyncHandler");
const { validateAuthPayload } = require("../validations/auth.validation");
const User = require("../models/user.model");
const {
  createUser,
  validateUserCredentials,
  generateAuthToken,
} = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const errors = validateAuthPayload({ name, email, password }, true);
  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: errors[0],
    });
  }

  const user = await createUser({ name, email, password });
  const token = generateAuthToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const errors = validateAuthPayload({ email, password });
  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: errors[0],
    });
  }

  const user = await validateUserCredentials({ email, password });
  const token = generateAuthToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = {
  register,
  login,
  getMe,
};
