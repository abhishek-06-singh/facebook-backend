const asyncHandler = require('../../utils/asyncHandler');
const followsService = require('./follows.service');

const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await followsService.followUser({
    currentUserId: req.userId,
    targetUserId: userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await followsService.unfollowUser({
    currentUserId: req.userId,
    targetUserId: userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;

  const result = await followsService.getFollowers({ userId, page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;

  const result = await followsService.getFollowing({ userId, page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
