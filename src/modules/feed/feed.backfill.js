const mongoose = require('mongoose');
const Feed = require('./feed.model');
const Post = require('../posts/posts.model');
const User = require('../../models/user.model');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getBackfillSinceDate = () => {
  const days = Math.max(parseInt(process.env.FEED_BACKFILL_DAYS, 10) || 30, 1);
  const now = new Date();
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};

const backfillUserFeed = async (userId) => {
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
  const sinceDate = getBackfillSinceDate();

  const posts = await Post.find({
    author: { $in: authorIds },
    createdAt: { $gte: sinceDate },
  })
    .select('_id author createdAt')
    .sort({ createdAt: -1 })
    .lean();

  if (!posts.length) {
    return { inserted: 0 };
  }

  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const docs = batch.map((post) => ({
      userId,
      postId: post._id,
      authorId: post.author,
      createdAt: post.createdAt,
    }));

    try {
      const result = await Feed.insertMany(docs, { ordered: false });
      inserted += result.length;
    } catch (error) {
      if (error?.insertedDocs) {
        inserted += error.insertedDocs.length;
      }
    }
  }

  return { inserted };
};

const backfillAllUsers = async () => {
  const users = await User.find().select('_id').lean();
  let totalInserted = 0;

  for (const user of users) {
    const result = await backfillUserFeed(user._id.toString());
    totalInserted += result.inserted || 0;
  }

  return { inserted: totalInserted };
};

module.exports = {
  backfillUserFeed,
  backfillAllUsers,
};
