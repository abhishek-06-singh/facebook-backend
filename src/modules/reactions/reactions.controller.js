const asyncHandler = require('../../utils/asyncHandler');
const reactionsService = require('./reactions.service');

const reactToPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { type } = req.body;

  const reaction = await reactionsService.reactToPost({
    postId,
    userId: req.userId,
    type,
  });

  res.status(200).json({
    success: true,
    data: reaction,
  });
});

const removeReaction = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const result = await reactionsService.removeReaction({
    postId,
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getPostReactionsSummary = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const summary = await reactionsService.getPostReactionsSummary(postId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

module.exports = {
  reactToPost,
  removeReaction,
  getPostReactionsSummary,
};
