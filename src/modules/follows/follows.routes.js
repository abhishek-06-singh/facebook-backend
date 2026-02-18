const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const followsController = require('./follows.controller');

const router = express.Router();

router.post('/:userId/follow', authMiddleware, followsController.followUser);
router.delete('/:userId/unfollow', authMiddleware, followsController.unfollowUser);
router.get('/:userId/followers', followsController.getFollowers);
router.get('/:userId/following', followsController.getFollowing);

module.exports = router;
