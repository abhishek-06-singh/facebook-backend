const asyncHandler = require('../../utils/asyncHandler');
const conversationsService = require('./conversations.service');

const getConversations = asyncHandler(async (req, res) => {
  const result = await conversationsService.getUserConversations({
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getConversationWithUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await conversationsService.getConversationWithUser({
    currentUserId: req.userId,
    otherUserId: userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getConversations,
  getConversationWithUser,
};
