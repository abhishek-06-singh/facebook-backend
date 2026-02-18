const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./modules/posts/posts.routes');
const commentsRoutes = require('./modules/comments/comments.routes');
const reactionsRoutes = require('./modules/reactions/reactions.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const followsRoutes = require('./modules/follows/follows.routes');
const feedRoutes = require('./modules/feed/feed.routes');
const storiesRoutes = require('./modules/stories/stories.routes');
const messagesRoutes = require('./modules/messages/messages.routes');
const conversationsRoutes = require('./modules/conversations/conversations.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/conversations', conversationsRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
