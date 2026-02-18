const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const commentsController = require('./comments.controller');

const router = express.Router();

router.post('/:postId', authMiddleware, commentsController.createComment);
router.get('/post/:postId', commentsController.getComments);
router.delete('/:commentId', authMiddleware, commentsController.deleteComment);

module.exports = router;
