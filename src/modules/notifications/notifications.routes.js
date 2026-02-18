const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const notificationsController = require('./notifications.controller');

const router = express.Router();

router.get('/', authMiddleware, notificationsController.getMyNotifications);
router.patch('/:id/read', authMiddleware, notificationsController.markNotificationAsRead);
router.patch('/read-all', authMiddleware, notificationsController.markAllNotificationsAsRead);

module.exports = router;
