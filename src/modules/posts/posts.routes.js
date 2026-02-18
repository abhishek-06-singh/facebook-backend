const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const { handlePostMediaUpload } = require('./posts.upload');
const postsController = require('./posts.controller');

const router = express.Router();

router.post('/', authMiddleware, handlePostMediaUpload, postsController.createPost);
router.get('/', postsController.getPosts);
router.get('/user/:userId', postsController.getPostsByUser);
router.get('/:postId', postsController.getPost);
router.patch('/:postId', authMiddleware, postsController.updatePost);
router.delete('/:postId', authMiddleware, postsController.deletePost);

module.exports = router;
