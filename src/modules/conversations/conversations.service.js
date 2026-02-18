const mongoose = require('mongoose');
const Conversation = require('./conversations.model');
const User = require('../../models/user.model');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getUserConversations = async ({ userId }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const conversations = await Conversation.find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name email avatar')
    .populate('lastMessageId')
    .lean();

  return { conversations };
};

const getConversationWithUser = async ({ currentUserId, otherUserId }) => {
  if (!currentUserId || !isValidObjectId(currentUserId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  if (!otherUserId || !isValidObjectId(otherUserId)) {
    const error = new Error('Invalid target user');
    error.statusCode = 400;
    throw error;
  }

  const otherUser = await User.findById(otherUserId).select('_id');
  if (!otherUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const participants = [currentUserId.toString(), otherUserId.toString()].sort();

  const conversation = await Conversation.findOne({
    participants: participants.map((id) => new mongoose.Types.ObjectId(id)),
  })
    .populate('participants', 'name email avatar')
    .populate('lastMessageId')
    .lean();

  return { conversation };
};

module.exports = {
  getUserConversations,
  getConversationWithUser,
};
