const asyncHandler = require('../../utils/asyncHandler');
const postsService = require('./posts.service');
const mediaStorage = require('../../shared/storage/media.storage');

const createPost = asyncHandler(async (req, res) => {
  const { text, images, videos, privacy } = req.body;
  const files = Array.isArray(req.files) ? req.files : [];
  const media = files.length
    ? await Promise.all(
        files.map(async (file) => {
          const uploaded = await mediaStorage.upload(file);
          return {
            key: uploaded.key,
            url: uploaded.url,
            type: file.mimetype && file.mimetype.startsWith('video/') ? 'video' : 'image',
            size: uploaded.size || file.size || 0,
            mimeType: uploaded.mimeType || file.mimetype || '',
            thumbnailUrl: uploaded.thumbnailUrl || '',
            previewUrl: uploaded.previewUrl || '',
            optimizedUrl: uploaded.optimizedUrl || '',
          };
        })
      )
    : [];

  const post = await postsService.createPost({
    authorId: req.userId,
    text,
    images,
    videos,
    privacy,
    media,
  });

  res.status(201).json({
    success: true,
    data: post,
  });
});

const getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await postsService.getPostById(postId);

  res.status(200).json({
    success: true,
    data: post,
  });
});

const getPosts = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await postsService.getPosts({ page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getPostsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;
  const result = await postsService.getPostsByUser({ userId, page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { text, images, videos, privacy } = req.body;

  const post = await postsService.updatePost({
    postId,
    userId: req.userId,
    payload: { text, images, videos, privacy },
  });

  res.status(200).json({
    success: true,
    data: post,
  });
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const result = await postsService.deletePost({
    postId,
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createPost,
  getPost,
  getPosts,
  getPostsByUser,
  updatePost,
  deletePost,
};
