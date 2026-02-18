const jwt = require('jsonwebtoken');
const EVENTS = require('./events');
const Conversation = require('../modules/conversations/conversations.model');

const setupSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const secret = process.env.JWT_SECRET;
      if (!secret) return next(new Error('Server misconfiguration'));

      const decoded = jwt.verify(token, secret);
      socket.userId = decoded.userId;

      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);

    try {
      const conversations = await Conversation.find({ participants: socket.userId })
        .select('_id')
        .lean();
      conversations.forEach((conv) => {
        socket.join(`conversation:${conv._id}`);
      });
    } catch (error) {
      // ignore join errors
    }

    socket.on('disconnect', () => {
      socket.leave(userRoom);
    });
  });

  return {
    emitMessageNew: (conversationId, payload) =>
      io.to(`conversation:${conversationId}`).emit(EVENTS.MESSAGE_NEW, payload),
    emitMessageRead: (userId, payload) => io.to(`user:${userId}`).emit(EVENTS.MESSAGE_READ, payload),
    emitConversationUpdate: (userId, payload) => io.to(`user:${userId}`).emit(EVENTS.CONVERSATION_UPDATE, payload),
    emitNotificationNew: (userId, payload) => io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION_NEW, payload),
  };
};

module.exports = setupSocket;
