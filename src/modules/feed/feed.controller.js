const asyncHandler = require('../../utils/asyncHandler');
const feedService = require('./feed.service');

const getFeed = asyncHandler(async (req, res) => {
  const { limit, cursorCreatedAt, cursorId } = req.query;

  const result = await feedService.getFeedPosts({
    userId: req.userId,
    limit,
    cursor: cursorCreatedAt && cursorId ? { createdAt: cursorCreatedAt, id: cursorId } : null,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getFeedOverview = asyncHandler(async (req, res) => {
  const { limit, cursorCreatedAt, cursorId } = req.query;

  const result = await feedService.getFeedOverview({
    userId: req.userId,
    limit,
    cursor: cursorCreatedAt && cursorId ? { createdAt: cursorCreatedAt, id: cursorId } : null,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getFeed,
  getFeedOverview,
};
