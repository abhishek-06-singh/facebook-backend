const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const storiesController = require('./stories.controller');

const router = express.Router();

router.post('/', authMiddleware, storiesController.createStory);
router.get('/feed', authMiddleware, storiesController.getStoriesFeed);
router.get('/:userId', authMiddleware, storiesController.getStoriesByUser);
router.post('/:id/view', authMiddleware, storiesController.viewStory);
router.delete('/:id', authMiddleware, storiesController.deleteStory);

module.exports = router;
