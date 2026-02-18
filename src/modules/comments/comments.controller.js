const asyncHandler = require('../../utils/asyncHandler');
const commentsService = require('./comments.service');

const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;

  const comment = await commentsService.createComment({
    postId,
    userId: req.userId,
    text,
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
});

const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page, limit } = req.query;

  const result = await commentsService.getCommentsByPost({ postId, page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const result = await commentsService.deleteComment({
    commentId,
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createComment,
  getComments,
  deleteComment,
};
