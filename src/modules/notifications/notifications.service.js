const mongoose = require('mongoose');
const Notification = require('./notifications.model');
const { getSocket } = require('../../socket/socket.instance');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const createNotification = async ({
  recipients,
  recipient,
  actorId,
  actor,
  type,
  entityId,
  post,
  comment,
}) => {
  const actorValue = actorId || actor;
  if (!actorValue || !isValidObjectId(actorValue)) {
    const error = new Error('Invalid actor');
    error.statusCode = 400;
    throw error;
  }

  const recipientList = Array.isArray(recipients)
    ? recipients
    : recipient
    ? [recipient]
    : [];

  if (!recipientList.length) {
    const error = new Error('Invalid recipient');
    error.statusCode = 400;
    throw error;
  }

  if (!['reaction', 'comment', 'follow', 'message', 'mention', 'like'].includes(type)) {
    const error = new Error('Invalid notification type');
    error.statusCode = 400;
    throw error;
  }

  if (entityId && !isValidObjectId(entityId)) {
    const error = new Error('Invalid entity id');
    error.statusCode = 400;
    throw error;
  }

  if (post && !isValidObjectId(post)) {
    const error = new Error('Invalid post id');
    error.statusCode = 400;
    throw error;
  }

  if (comment && !isValidObjectId(comment)) {
    const error = new Error('Invalid comment id');
    error.statusCode = 400;
    throw error;
  }

  const docs = recipientList
    .filter((rec) => rec && isValidObjectId(rec))
    .filter((rec) => rec.toString() !== actorValue.toString())
    .map((rec) => ({
      recipient: rec,
      userId: rec,
      actor: actorValue,
      actorId: actorValue,
      type,
      post: post || null,
      comment: comment || null,
      entityId: entityId || post || comment || null,
      read: false,
      readAt: null,
    }));

  if (!docs.length) return null;

  const created = await Notification.insertMany(docs, { ordered: false });
  const notifications = Array.isArray(created) ? created.map((doc) => doc.toObject()) : [];

  const io = getSocket();
  if (io) {
    const notificationsByUser = new Map();
    notifications.forEach((notification) => {
      const userKey = (notification.userId || notification.recipient || '').toString();
      if (!userKey) return;
      if (!notificationsByUser.has(userKey)) {
        notificationsByUser.set(userKey, []);
      }
      notificationsByUser.get(userKey).push(notification);
    });

    for (const [userId, items] of notificationsByUser.entries()) {
      items.forEach((notification) => {
        io.to(`user:${userId}`).emit('notification:new', notification);
      });
      const unread = await getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:unread', { count: unread.count });
    }
  }

  return notifications.length ? notifications : null;
};

const getUserNotifications = async ({ userId, page = 1, limit = 10 }) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [notifications, total] = await Promise.all([
    Notification.find({ $or: [{ userId }, { recipient: userId }] })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate('actor', 'name email avatar')
      .populate('post', 'text')
      .populate('comment', 'text')
      .lean(),
    Notification.countDocuments({ $or: [{ userId }, { recipient: userId }] }),
  ]);

  return {
    notifications,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
    },
  };
};

const markAsRead = async (notificationId, userId) => {
  if (!isValidObjectId(notificationId)) {
    const error = new Error('Invalid notification id');
    error.statusCode = 400;
    throw error;
  }

  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  const recipientId = notification.userId || notification.recipient;
  if (!recipientId || recipientId.toString() !== userId) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  if (!notification.readAt) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  const io = getSocket();
  if (io) {
    const unread = await getUnreadCount(userId);
    io.to(`user:${userId}`).emit('notification:unread', { count: unread.count });
  }

  return notification.toObject();
};

const markAllAsRead = async (userId) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  await Notification.updateMany(
    { $or: [{ userId }, { recipient: userId }], readAt: null },
    { $set: { read: true, readAt: new Date() } }
  );

  const io = getSocket();
  if (io) {
    const unread = await getUnreadCount(userId);
    io.to(`user:${userId}`).emit('notification:unread', { count: unread.count });
  }

  return { updated: true };
};

const getUnreadCount = async (userId) => {
  if (!userId || !isValidObjectId(userId)) {
    const error = new Error('Invalid user');
    error.statusCode = 400;
    throw error;
  }

  const count = await Notification.countDocuments({
    $or: [{ userId }, { recipient: userId }],
    readAt: null,
  });

  return { count };
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
