const mongoose = require('mongoose');
const Post = require('../posts/posts.model');
const Feed = require('./feed.model');
const User = require('../../models/user.model');
const { getStoriesFeed } = require('../stories/stories.service');
const { safeGetRedisClient } = require('../../shared/cache/redis.client');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const buildCursorMatch = (cursor) => {
  if (!cursor) return {};

  const { createdAt, id } = cursor;
  if (!createdAt || !id || !isValidObjectId(id)) return {};

  const cursorDate = new Date(createdAt);
  if (Number.isNaN(cursorDate.getTime())) return {};

  return {
    $or: [
      { createdAt: { $lt: cursorDate } },
      { createdAt: cursorDate, _id: { $lt: new mongoose.Types.ObjectId(id) } },
    ],
  };
};

const getFeedPosts = async ({ userId, limit = 10, cursor }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const cacheTtl = Math.max(parseInt(process.env.FEED_CACHE_TTL_SECONDS, 10) || 60, 5);
  const cursorKey = cursor && cursor.createdAt && cursor.id ? `${cursor.createdAt}:${cursor.id}` : 'first';
  const cacheKey = `feed:${userId}:${cursorKey}:${limitNumber}`;
  const redis = safeGetRedisClient();

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const user = await User.findById(userId).select('following interactionMap').lean();
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const interactionMap = user.interactionMap || {};
  const authorIds = [...user.following.map((id) => id.toString()), userId];
  const cursorMatch = buildCursorMatch(cursor);

  const feedCursorMatch = buildCursorMatch(cursor);
  const feedEntries = await Feed.find({
    userId,
    ...feedCursorMatch,
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitNumber + 1)
    .lean();

  if (!feedEntries.length) {
    const pipeline = [
    {
      $match: {
        author: { $in: authorIds.map((id) => new mongoose.Types.ObjectId(id)) },
        ...cursorMatch,
      },
    },
    {
      $addFields: {
        interactionAt: {
          $getField: {
            field: { $toString: '$author' },
            input: interactionMap,
          },
        },
      },
    },
    {
      $addFields: {
        interactionBoost: {
          $cond: [
            { $ifNull: ['$interactionAt', false] },
            {
              $multiply: [
                {
                  $max: [
                    0,
                    {
                      $subtract: [
                        1,
                        {
                          $divide: [
                            {
                              $dateDiff: {
                                startDate: '$interactionAt',
                                endDate: '$$NOW',
                                unit: 'hour',
                              },
                            },
                            168,
                          ],
                        },
                      ],
                    },
                  ],
                },
                10000,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $toLong: '$createdAt' },
            { $multiply: ['$reactionsCount', 1000] },
            { $multiply: ['$commentsCount', 1500] },
            '$interactionBoost',
          ],
        },
      },
    },
    { $sort: { score: -1, createdAt: -1, _id: -1 } },
    { $limit: limitNumber + 1 },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
      },
    },
    { $unwind: '$author' },
    {
      $project: {
        text: 1,
        images: 1,
        videos: 1,
        privacy: 1,
        reactionsCount: 1,
        commentsCount: 1,
        sharesCount: 1,
        createdAt: 1,
        updatedAt: 1,
        score: 1,
        author: {
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
        },
      },
    },
  ];

    const results = await Post.aggregate(pipeline);
    const hasNext = results.length > limitNumber;
    const posts = hasNext ? results.slice(0, limitNumber) : results;

    const nextCursor = hasNext
      ? {
          createdAt: posts[posts.length - 1].createdAt,
          id: posts[posts.length - 1]._id,
        }
      : null;

    const response = {
      posts,
      nextCursor,
    };
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(response), 'EX', cacheTtl);
    }

    return response;
  }

  const hasNext = feedEntries.length > limitNumber;
  const entries = hasNext ? feedEntries.slice(0, limitNumber) : feedEntries;
  const postIds = entries.map((entry) => entry.postId);
  const postsById = await Post.find({ _id: { $in: postIds } })
    .populate('author', 'name email avatar')
    .lean();

  const postMap = new Map(postsById.map((post) => [post._id.toString(), post]));
  const posts = entries
    .map((entry) => postMap.get(entry.postId.toString()))
    .filter(Boolean);

  const nextCursor = hasNext
    ? {
        createdAt: entries[entries.length - 1].createdAt,
        id: entries[entries.length - 1]._id,
      }
    : null;

  const response = {
    posts,
    nextCursor,
  };
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(response), 'EX', cacheTtl);
  }

  return response;
};

const getFeedOverview = async ({ userId, limit = 10, cursor }) => {
  const [stories, posts] = await Promise.all([
    getStoriesFeed({ userId }),
    getFeedPosts({ userId, limit, cursor }),
  ]);

  return {
    stories,
    posts: posts.posts,
    nextCursor: posts.nextCursor,
  };
};

module.exports = {
  getFeedPosts,
  getFeedOverview,
};
