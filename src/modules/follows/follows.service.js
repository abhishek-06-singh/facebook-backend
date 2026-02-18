const mongoose = require('mongoose');
const User = require('../../models/user.model');
const { createNotification } = require('../notifications/notifications.service');
const { updateInteraction } = require('../../shared/utils/interaction.util');
const { backfillUserFeed } = require('../feed/feed.backfill');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const followUser = async ({ currentUserId, targetUserId }) => {
  if (!currentUserId || !isValidObjectId(currentUserId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  if (!targetUserId || !isValidObjectId(targetUserId)) {
    const error = new Error('Invalid target user');
    error.statusCode = 400;
    throw error;
  }

  if (currentUserId === targetUserId) {
    const error = new Error('Cannot follow self');
    error.statusCode = 400;
    throw error;
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId),
  ]);

  if (!targetUser) {
    const error = new Error('Target user not found');
    error.statusCode = 404;
    throw error;
  }

  if (!currentUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const alreadyFollowing = currentUser.following.some(
    (id) => id.toString() === targetUserId
  );

  if (alreadyFollowing) {
    return { followed: false };
  }

  currentUser.following.push(targetUser._id);
  targetUser.followers.push(currentUser._id);

  await Promise.all([currentUser.save(), targetUser.save()]);

  if (currentUserId !== targetUserId) {
    await createNotification({
      recipient: targetUserId,
      actor: currentUserId,
      type: 'follow',
    });
  }

  backfillUserFeed(currentUserId).catch(() => null);

  await updateInteraction(currentUserId, targetUserId);

  return { followed: true };
};

const unfollowUser = async ({ currentUserId, targetUserId }) => {
  if (!currentUserId || !isValidObjectId(currentUserId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  if (!targetUserId || !isValidObjectId(targetUserId)) {
    const error = new Error('Invalid target user');
    error.statusCode = 400;
    throw error;
  }

  if (currentUserId === targetUserId) {
    const error = new Error('Cannot unfollow self');
    error.statusCode = 400;
    throw error;
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId),
  ]);

  if (!targetUser) {
    const error = new Error('Target user not found');
    error.statusCode = 404;
    throw error;
  }

  if (!currentUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const wasFollowing = currentUser.following.some(
    (id) => id.toString() === targetUserId
  );

  if (!wasFollowing) {
    return { unfollowed: false };
  }

  currentUser.following = currentUser.following.filter(
    (id) => id.toString() !== targetUserId
  );
  targetUser.followers = targetUser.followers.filter(
    (id) => id.toString() !== currentUserId
  );

  await Promise.all([currentUser.save(), targetUser.save()]);

  return { unfollowed: true };
};

const getFollowers = async ({ userId, page = 1, limit = 10 }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const user = await User.findById(userId)
    .populate('followers', 'name email avatar')
    .lean();

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const total = user.followers.length;
  const newestFirst = user.followers.slice().reverse();
  const followers = newestFirst.slice(skip, skip + limitNumber);

  return {
    followers,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
    },
  };
};

const getFollowing = async ({ userId, page = 1, limit = 10 }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const user = await User.findById(userId)
    .populate('following', 'name email avatar')
    .lean();

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const total = user.following.length;
  const newestFirst = user.following.slice().reverse();
  const following = newestFirst.slice(skip, skip + limitNumber);

  return {
    following,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
    },
  };
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
