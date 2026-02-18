const mongoose = require('mongoose');
const Story = require('./stories.model');
const User = require('../../models/user.model');
const { updateInteraction } = require('../../shared/utils/interaction.util');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const ensureViewerAccess = async ({ userId, authorId }) => {
  if (userId === authorId) return true;

  const user = await User.findById(userId).select('following').lean();
  if (!user) return false;

  return user.following.some((id) => id.toString() === authorId);
};

const createStory = async ({ userId, media }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  if (!media) {
    const error = new Error('Media is required');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const story = await Story.create({
    author: userId,
    media,
    expiresAt,
  });

  return story.toObject();
};

const getStoriesFeed = async ({ userId }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('following').lean();
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const authorIds = [...user.following.map((id) => id.toString()), userId];
  const now = new Date();

  const pipeline = [
    {
      $match: {
        author: { $in: authorIds.map((id) => new mongoose.Types.ObjectId(id)) },
        expiresAt: { $gt: now },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$author',
        latestStory: { $first: '$$ROOT' },
        stories: { $push: '$$ROOT' },
      },
    },
    { $sort: { 'latestStory.createdAt': -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'author',
      },
    },
    { $unwind: '$author' },
    {
      $project: {
        author: {
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
        },
        latestStory: {
          _id: 1,
          media: 1,
          createdAt: 1,
          expiresAt: 1,
          viewersCount: 1,
        },
        stories: {
          _id: 1,
          media: 1,
          createdAt: 1,
          expiresAt: 1,
          viewersCount: 1,
        },
      },
    },
  ];

  return Story.aggregate(pipeline);
};

const getStoriesByUser = async ({ userId, viewerId }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  if (!viewerId || !isValidObjectId(viewerId)) {
    const error = new Error('Invalid viewer');
    error.statusCode = 400;
    throw error;
  }

  const canView = await ensureViewerAccess({ userId: viewerId, authorId: userId });
  if (!canView) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const now = new Date();
  const stories = await Story.find({ author: userId, expiresAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .lean();

  return { stories };
};

const viewStory = async ({ storyId, viewerId }) => {
  if (!storyId || !isValidObjectId(storyId)) {
    const error = new Error('Invalid story id');
    error.statusCode = 400;
    throw error;
  }

  if (!viewerId || !isValidObjectId(viewerId)) {
    const error = new Error('Invalid viewer');
    error.statusCode = 400;
    throw error;
  }

  const story = await Story.findById(storyId);
  if (!story || story.expiresAt <= new Date()) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }

  const canView = await ensureViewerAccess({ userId: viewerId, authorId: story.author.toString() });
  if (!canView) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const alreadyViewed = story.viewers.some((id) => id.toString() === viewerId);
  if (!alreadyViewed) {
    story.viewers.push(new mongoose.Types.ObjectId(viewerId));
    story.viewersCount += 1;
    await story.save();
  }

  await updateInteraction(viewerId, story.author.toString());

  return story.toObject();
};

const deleteStory = async ({ storyId, userId }) => {
  if (!storyId || !isValidObjectId(storyId)) {
    const error = new Error('Invalid story id');
    error.statusCode = 400;
    throw error;
  }

  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const story = await Story.findById(storyId);
  if (!story) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }

  if (story.author.toString() !== userId) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await story.deleteOne();

  return { deleted: true };
};

module.exports = {
  createStory,
  getStoriesFeed,
  getStoriesByUser,
  viewStory,
  deleteStory,
};
