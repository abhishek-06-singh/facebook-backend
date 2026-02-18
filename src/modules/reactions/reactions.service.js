const mongoose = require('mongoose');
const Reaction = require('./reactions.model');
const Post = require('../posts/posts.model');
const { createNotification } = require('../notifications/notifications.service');
const { updateInteraction } = require('../../shared/utils/interaction.util');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

const reactToPost = async ({ postId, userId, type }) => {
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

  if (!reactionTypes.includes(type)) {
    const error = new Error('Invalid reaction type');
    error.statusCode = 400;
    throw error;
  }

  const post = await Post.findById(postId);
  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Reaction.findOne({ post: postId, user: userId });

  if (existing) {
    if (existing.type === type) {
      return existing.toObject();
    }

    existing.type = type;
    await existing.save();
    return existing.toObject();
  }

  const reaction = await Reaction.create({ post: postId, user: userId, type });
  await Post.findByIdAndUpdate(postId, { $inc: { reactionsCount: 1 } });

  if (post.author.toString() !== userId) {
    await createNotification({
      recipient: post.author,
      actor: userId,
      type: 'reaction',
      post: postId,
    });
  }

  await updateInteraction(userId, post.author.toString());

  return reaction.toObject();
};

const removeReaction = async ({ postId, userId }) => {
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

  const reaction = await Reaction.findOne({ post: postId, user: userId });
  if (!reaction) {
    return { removed: false };
  }

  await reaction.deleteOne();
  await Post.findByIdAndUpdate(postId, { $inc: { reactionsCount: -1 } });
  await Post.updateOne({ _id: postId, reactionsCount: { $lt: 0 } }, { $set: { reactionsCount: 0 } });

  return { removed: true };
};

const getPostReactionsSummary = async (postId) => {
  if (!isValidObjectId(postId)) {
    const error = new Error('Invalid post id');
    error.statusCode = 400;
    throw error;
  }

  const post = await Post.findById(postId).select('_id');
  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const counts = await Reaction.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(postId) } },
    { $group: { _id: '$type', total: { $sum: 1 } } },
  ]);

  const byType = reactionTypes.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

  counts.forEach((item) => {
    byType[item._id] = item.total;
  });

  const total = Object.values(byType).reduce((sum, value) => sum + value, 0);

  return {
    total,
    byType,
  };
};

module.exports = {
  reactToPost,
  removeReaction,
  getPostReactionsSummary,
};
