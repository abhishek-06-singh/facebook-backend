const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const reactionsController = require('./reactions.controller');

const router = express.Router();

router.post('/:postId', authMiddleware, reactionsController.reactToPost);
router.delete('/:postId', authMiddleware, reactionsController.removeReaction);
router.get('/:postId', reactionsController.getPostReactionsSummary);

module.exports = router;
