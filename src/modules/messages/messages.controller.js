const asyncHandler = require('../../utils/asyncHandler');
const messagesService = require('./messages.service');

const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, text, attachments } = req.body;

  const message = await messagesService.sendMessage({
    senderId: req.userId,
    receiverId,
    text,
    attachments,
  });

  res.status(201).json({
    success: true,
    data: message,
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { limit, cursorCreatedAt, cursorId } = req.query;

  const result = await messagesService.getMessages({
    conversationId,
    userId: req.userId,
    limit,
    cursor: cursorCreatedAt && cursorId ? { createdAt: cursorCreatedAt, id: cursorId } : null,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await messagesService.markAsRead({
    conversationId: id,
    userId: req.userId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
};
