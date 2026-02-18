const mongoose = require('mongoose');
const Comment = require('./comments.model');
const Post = require('../posts/posts.model');
const { createNotification } = require('../notifications/notifications.service');
const { updateInteraction } = require('../../shared/utils/interaction.util');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const createComment = async ({ postId, userId, text }) => {
  if (!isValidObjectId(postId)) {
    const error = new Error('Invalid post id');
    error.statusCode = 400;
    throw error;
  }

  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  if (!text || text.length > 1000) {
    const error = new Error('Text is required and must be 1000 characters or less');
    error.statusCode = 400;
    throw error;
  }

  const post = await Post.findById(postId);
  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const comment = await Comment.create({
    post: postId,
    author: userId,
    text,
  });

  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  if (post.author.toString() !== userId) {
    await createNotification({
      recipient: post.author,
      actor: userId,
      type: 'comment',
      post: postId,
      comment: comment._id,
    });
  }

  await updateInteraction(userId, post.author.toString());

  return comment.toObject();
};

const getCommentsByPost = async ({ postId, page = 1, limit = 10 }) => {
  if (!isValidObjectId(postId)) {
    const error = new Error('Invalid post id');
    error.statusCode = 400;
    throw error;
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [comments, total] = await Promise.all([
    Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate('author', 'name email avatar')
      .lean(),
    Comment.countDocuments({ post: postId }),
  ]);

  return {
    comments,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
    },
  };
};

const deleteComment = async ({ commentId, userId }) => {
  if (!isValidObjectId(commentId)) {
    const error = new Error('Invalid comment id');
    error.statusCode = 400;
    throw error;
  }

  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  if (comment.author.toString() !== userId) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await comment.deleteOne();
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

  return { deleted: true };
};

module.exports = {
  createComment,
  getCommentsByPost,
  deleteComment,
};
