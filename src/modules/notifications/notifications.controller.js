const asyncHandler = require('../../utils/asyncHandler');
const notificationsService = require('./notifications.service');

const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await notificationsService.getUserNotifications({
    userId: req.userId,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await notificationsService.markAsRead(id, req.userId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await notificationsService.markAllAsRead(req.userId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
