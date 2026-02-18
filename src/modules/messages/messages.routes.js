const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const messagesController = require('./messages.controller');

const router = express.Router();

router.post('/', authMiddleware, messagesController.sendMessage);
router.get('/:conversationId', authMiddleware, messagesController.getMessages);
router.post('/:id/read', authMiddleware, messagesController.markAsRead);

module.exports = router;
