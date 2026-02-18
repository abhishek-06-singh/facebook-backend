const mongoose = require('mongoose');
const Message = require('./messages.model');
const Conversation = require('../conversations/conversations.model');
const User = require('../../models/user.model');
const { createNotification } = require('../notifications/notifications.service');
const { getSocket } = require('../../socket/socket.instance');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeParticipants = (userA, userB) => {
  const a = userA.toString();
  const b = userB.toString();
  return a < b ? [userA, userB] : [userB, userA];
};

const buildCursorMatch = (cursor) => {
  if (!cursor) return {};

  const { createdAt, id } = cursor;
  if (!createdAt || !id || !isValidObjectId(id)) return {};

  const cursorDate = new Date(createdAt);
  if (Number.isNaN(cursorDate.getTime())) return {};

  return {
    $or: [
      { createdAt: { $lt: cursorDate } },
      { createdAt: cursorDate, _id: { $lt: new mongoose.Types.ObjectId(id) } },
    ],
  };
};

const findOrCreateConversation = async ({ userAId, userBId }) => {
  const participants = normalizeParticipants(userAId, userBId);

  let conversation = await Conversation.findOne({ participants });
  if (conversation) return conversation;

  conversation = await Conversation.create({
    participants,
    lastMessageId: null,
    lastMessageAt: null,
    unreadCountMap: {
      [userAId.toString()]: 0,
      [userBId.toString()]: 0,
    },
  });

  return conversation;
};

const sendMessage = async ({ senderId, receiverId, text, attachments }) => {
  if (!senderId || !isValidObjectId(senderId)) {
    const error = new Error('Invalid sender');
    error.statusCode = 400;
    throw error;
  }

  if (!receiverId || !isValidObjectId(receiverId)) {
    const error = new Error('Invalid receiver');
    error.statusCode = 400;
    throw error;
  }

  if (senderId.toString() === receiverId.toString()) {
    const error = new Error('Cannot message yourself');
    error.statusCode = 400;
    throw error;
  }

  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select('_id'),
    User.findById(receiverId).select('_id'),
  ]);

  if (!sender || !receiver) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (!text && (!attachments || attachments.length === 0)) {
    const error = new Error('Message text or attachments required');
    error.statusCode = 400;
    throw error;
  }

  const conversation = await findOrCreateConversation({
    userAId: senderId,
    userBId: receiverId,
  });

  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    text: text || '',
    attachments: Array.isArray(attachments) ? attachments : [],
    seenBy: [senderId],
  });

  const receiverKey = receiverId.toString();
  const currentUnread = conversation.unreadCountMap?.get(receiverKey) || 0;
  conversation.unreadCountMap.set(receiverKey, currentUnread + 1);
  conversation.lastMessageId = message._id;
  conversation.lastMessageAt = message.createdAt;

  await conversation.save();

  await createNotification({
    recipient: receiverId,
    actor: senderId,
    type: 'message',
  });

  const io = getSocket();
  if (io) {
    io.to(`conversation:${conversation._id}`).emit('message:new', message.toObject());
  }

  return message.toObject();
};

const getMessages = async ({ conversationId, userId, limit = 20, cursor }) => {
  if (!conversationId || !isValidObjectId(conversationId)) {
    const error = new Error('Invalid conversation id');
    error.statusCode = 400;
    throw error;
  }

  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = conversation.participants.some(
    (id) => id.toString() === userId
  );
  if (!isParticipant) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const cursorMatch = buildCursorMatch(cursor);

  const messages = await Message.find({
    conversationId,
    ...cursorMatch,
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitNumber + 1)
    .lean();

  const hasNext = messages.length > limitNumber;
  const items = hasNext ? messages.slice(0, limitNumber) : messages;

  const nextCursor = hasNext
    ? {
        createdAt: items[items.length - 1].createdAt,
        id: items[items.length - 1]._id,
      }
    : null;

  return {
    messages: items,
    nextCursor,
  };
};

const markAsRead = async ({ conversationId, userId }) => {
  if (!conversationId || !isValidObjectId(conversationId)) {
    const error = new Error('Invalid conversation id');
    error.statusCode = 400;
    throw error;
  }

  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = conversation.participants.some(
    (id) => id.toString() === userId
  );
  if (!isParticipant) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const unreadMessages = await Message.find({
    conversationId,
    seenBy: { $ne: new mongoose.Types.ObjectId(userId) },
  })
    .select('_id')
    .lean();

  await Message.updateMany(
    { conversationId, seenBy: { $ne: new mongoose.Types.ObjectId(userId) } },
    { $addToSet: { seenBy: new mongoose.Types.ObjectId(userId) } }
  );

  conversation.unreadCountMap.set(userId.toString(), 0);
  await conversation.save();

  const io = getSocket();
  if (io && unreadMessages.length) {
    const readAt = new Date().toISOString();
    const messageIds = unreadMessages.map((msg) => msg._id.toString());
    io.to(`conversation:${conversationId}`).emit('message:readMany', {
      messageIds,
      userId,
      readAt,
    });
  }

  return { updated: true };
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
};
