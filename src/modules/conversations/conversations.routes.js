const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const conversationsController = require('./conversations.controller');

const router = express.Router();

router.get('/', authMiddleware, conversationsController.getConversations);
router.get('/:userId', authMiddleware, conversationsController.getConversationWithUser);

module.exports = router;
