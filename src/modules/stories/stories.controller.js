const asyncHandler = require('../../utils/asyncHandler');
const storiesService = require('./stories.service');

const createStory = asyncHandler(async (req, res) => {
  const { media } = req.body;

  const story = await storiesService.createStory({
    userId: req.userId,
    media,
  });

  res.status(201).json({
    success: true,
    data: story,
  });
});

const getStoriesFeed = asyncHandler(async (req, res) => {
  const result = await storiesService.getStoriesFeed({ userId: req.userId });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const getStoriesByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await storiesService.getStoriesByUser({
    userId,
    viewerId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const viewStory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const story = await storiesService.viewStory({
    storyId: id,
    viewerId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: story,
  });
});

const deleteStory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await storiesService.deleteStory({
    storyId: id,
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createStory,
  getStoriesFeed,
  getStoriesByUser,
  viewStory,
  deleteStory,
};
