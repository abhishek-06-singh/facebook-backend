const mongoose = require('mongoose');
const Post = require('./posts.model');
const User = require('../../models/user.model');
const Feed = require('../feed/feed.model');
const { safeGetRedisClient } = require('../../shared/cache/redis.client');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const createPost = async ({ authorId, text, images, videos, privacy, media }) => {
  if (!authorId || !isValidObjectId(authorId)) {
    const error = new Error('Invalid author');
    error.statusCode = 400;
    throw error;
  }

  if (text && text.length > 5000) {
    const error = new Error('Text exceeds 5000 characters');
    error.statusCode = 400;
    throw error;
  }

  const imageList = Array.isArray(images) ? images : [];
  const videoList = Array.isArray(videos) ? videos : [];
  const mediaList = Array.isArray(media) ? media : [];
  const totalMedia = imageList.length + videoList.length;

  if (imageList.length > 10) {
    const error = new Error('Too many images');
    error.statusCode = 400;
    throw error;
  }

  if (videoList.length > 5) {
    const error = new Error('Too many videos');
    error.statusCode = 400;
    throw error;
  }

  if (totalMedia > 10) {
    const error = new Error('Too many media items');
    error.statusCode = 400;
    throw error;
  }

  const imageExtPattern = /\.(jpg|jpeg|png|webp)$/i;
  const videoExtPattern = /\.(mp4|mov|webm)$/i;

  const invalidImage = imageList.find((url) => !imageExtPattern.test(url));
  if (invalidImage) {
    const error = new Error('Invalid image format');
    error.statusCode = 400;
    throw error;
  }

  const invalidVideo = videoList.find((url) => !videoExtPattern.test(url));
  if (invalidVideo) {
    const error = new Error('Invalid video format');
    error.statusCode = 400;
    throw error;
  }

  if (mediaList.length > 10) {
    const error = new Error('Too many media items');
    error.statusCode = 400;
    throw error;
  }

  const invalidMedia = mediaList.find(
    (item) =>
      !item ||
      !item.url ||
      !['image', 'video'].includes(item.type) ||
      (item.mimeType && !item.mimeType.startsWith(`${item.type}/`))
  );
  if (invalidMedia) {
    const error = new Error('Invalid media item');
    error.statusCode = 400;
    throw error;
  }

  const post = await Post.create({
    author: authorId,
    text: text || '',
    images: imageList,
    videos: videoList,
    privacy: privacy || 'public',
    media: mediaList,
  });

  try {
    const author = await User.findById(authorId).select('followers').lean();
    const followerIds = author?.followers || [];
    const userIds = [authorId, ...followerIds];
    if (userIds.length) {
      const now = new Date();
      const feedDocs = userIds.map((userId) => ({
        userId,
        postId: post._id,
        authorId,
        createdAt: now,
      }));
      await Feed.insertMany(feedDocs, { ordered: false });
    }
  } catch (error) {
    // ignore fanout errors
  }

  const redis = safeGetRedisClient();
  if (redis) {
    try {
      const author = await User.findById(authorId).select('followers').lean();
      const affectedUsers = new Set([
        authorId.toString(),
        ...(author?.followers || []).map((id) => id.toString()),
      ]);

      const deleteByPattern = async (pattern) => {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
          cursor = nextCursor;
          if (keys.length) {
            const pipeline = redis.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
          }
        } while (cursor !== '0');
      };

      for (const userId of affectedUsers) {
        await deleteByPattern(`feed:${userId}:*`);
      }
    } catch (error) {
      // ignore cache errors
    }
  }

  return post.toObject();
};

const getPostById = async (postId) => {
  if (!isValidObjectId(postId)) {
    const error = new Error('Invalid post id');
    error.statusCode = 400;
    throw error;
  }

  const post = await Post.findById(postId).populate('author', 'name email avatar');

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  return post;
};

const getPosts = async ({ page = 1, limit = 10 }) => {
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [posts, total] = await Promise.all([
    Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate('author', 'name email avatar')
      .lean(),
    Post.countDocuments(),
  ]);

  return {
    posts,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
    },
  };
};

const getPostsByUser = async ({ userId, page = 1, limit = 10 }) => {
  if (!isValidObjectId(userId)) {
    const error = new Error('Invalid user id');
    error.statusCode = 400;
    throw error;
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [posts, total] = await Promise.all([
    Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate('author', 'name email avatar')
      .lean(),
    Post.countDocuments({ author: userId }),
  ]);

  return {
    posts,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
    },
  };
};

const updatePost = async ({ postId, userId, payload }) => {
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

  if (payload.text && payload.text.length > 5000) {
    const error = new Error('Text exceeds 5000 characters');
    error.statusCode = 400;
    throw error;
  }

  const imageList = payload.images !== undefined ? payload.images : undefined;
  const videoList = payload.videos !== undefined ? payload.videos : undefined;
  const mediaList = payload.media !== undefined ? payload.media : undefined;

  const finalImages = Array.isArray(imageList)
    ? imageList
    : imageList === undefined
    ? undefined
    : [];
  const finalVideos = Array.isArray(videoList)
    ? videoList
    : videoList === undefined
    ? undefined
    : [];
  const finalMedia = Array.isArray(mediaList)
    ? mediaList
    : mediaList === undefined
    ? undefined
    : [];

  if (finalImages && finalImages.length > 10) {
    const error = new Error('Too many images');
    error.statusCode = 400;
    throw error;
  }

  if (finalVideos && finalVideos.length > 5) {
    const error = new Error('Too many videos');
    error.statusCode = 400;
    throw error;
  }

  if (finalImages || finalVideos) {
    const totalMedia =
      (finalImages ? finalImages.length : 0) +
      (finalVideos ? finalVideos.length : 0);

    if (totalMedia > 10) {
      const error = new Error('Too many media items');
      error.statusCode = 400;
      throw error;
    }

    const imageExtPattern = /\.(jpg|jpeg|png|webp)$/i;
    const videoExtPattern = /\.(mp4|mov|webm)$/i;

    if (finalImages) {
      const invalidImage = finalImages.find((url) => !imageExtPattern.test(url));
      if (invalidImage) {
        const error = new Error('Invalid image format');
        error.statusCode = 400;
        throw error;
      }
    }

    if (finalVideos) {
      const invalidVideo = finalVideos.find((url) => !videoExtPattern.test(url));
      if (invalidVideo) {
        const error = new Error('Invalid video format');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  if (finalMedia) {
    if (finalMedia.length > 10) {
      const error = new Error('Too many media items');
      error.statusCode = 400;
      throw error;
    }

    const invalidMedia = finalMedia.find(
      (item) =>
        !item ||
        !item.url ||
        !['image', 'video'].includes(item.type) ||
        (item.mimeType && !item.mimeType.startsWith(`${item.type}/`))
    );
    if (invalidMedia) {
      const error = new Error('Invalid media item');
      error.statusCode = 400;
      throw error;
    }
  }

  if (payload.privacy !== undefined) {
    const allowedPrivacy = ['public', 'friends'];
    if (!allowedPrivacy.includes(payload.privacy)) {
      const error = new Error('Invalid privacy value');
      error.statusCode = 400;
      throw error;
    }
  }

  const post = await Post.findById(postId);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (post.author.toString() !== userId) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  if (payload.text !== undefined) post.text = payload.text;
  if (payload.images !== undefined) post.images = finalImages;
  if (payload.videos !== undefined) post.videos = finalVideos;
  if (payload.media !== undefined) post.media = finalMedia;
  if (payload.privacy !== undefined) post.privacy = payload.privacy;

  await post.save();

  return post.toObject();
};

const deletePost = async ({ postId, userId }) => {
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

  const post = await Post.findById(postId);

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  if (post.author.toString() !== userId) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await post.deleteOne();

  return { deleted: true };
};

module.exports = {
  createPost,
  getPostById,
  getPosts,
  getPostsByUser,
  updatePost,
  deletePost,
};
