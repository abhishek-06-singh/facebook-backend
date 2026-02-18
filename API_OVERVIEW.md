Social Media Backend — API Overview

This file lists all available REST APIs and their core features for quick understanding and testing scope.

Auth
Base path: /api/auth
APIs:
POST /register
Create user account
Features: JWT-based registration
POST /login
Authenticate user
Features: JWT login
GET /me
Get current user
Features: auth required

Posts
Base path: /api/posts
APIs:
POST /
Create post with text and media upload
Features: multipart upload, Cloudinary storage, media variants
GET /
List posts
Features: pagination, newest-first
GET /user/:userId
Get posts by user
Features: pagination, newest-first
GET /:postId
Get single post
Features: populated author
PATCH /:postId
Update post
Features: ownership validation, media validation
DELETE /:postId
Delete post
Features: ownership validation

Feed
Base path: /api/feed
APIs:
GET /
Get user feed
Features: fanout-on-write, cursor pagination, caching fallback
GET /overview
Get feed + stories overview
Features: fanout feed with stories aggregation

Follows
Base path: /api/follows
APIs:
POST /:userId/follow
Follow user
Features: follow graph updates, notification fanout
DELETE /:userId/unfollow
Unfollow user
Features: follow graph updates
GET /:userId/followers
Get followers
Features: pagination
GET /:userId/following
Get following
Features: pagination

Notifications
Base path: /api/notifications
APIs:
GET /
Get notifications
Features: fanout storage, pagination
PATCH /:id/read
Mark notification read
Features: read tracking
PATCH /read-all
Mark all notifications read
Features: unread reset

Messages
Base path: /api/messages
APIs:
POST /
Send message
Features: conversation auto-create, notifications
GET /:conversationId
Get messages
Features: cursor pagination
POST /:id/read
Mark conversation read
Features: read receipts

Conversations
Base path: /api/conversations
APIs:
GET /
List conversations
Features: last message metadata
GET /:userId
Get conversation with user
Features: direct conversation lookup

Stories
Base path: /api/stories
APIs:
POST /
Create story
Features: 24h expiry
GET /feed
Get stories feed
Features: follower-only feed
GET /:userId
Get user stories
Features: follower-only access
POST /:id/view
View story
Features: viewer tracking
DELETE /:id
Delete story
Features: ownership validation

Comments
Base path: /api/comments
APIs:
POST /:postId
Create comment
Features: auth required, notifications, counts
GET /post/:postId
Get comments for post
Features: pagination
DELETE /:commentId
Delete comment
Features: ownership validation

Reactions
Base path: /api/reactions
APIs:
POST /:postId
React to post
Features: react or update, notifications
DELETE /:postId
Remove reaction
Features: count updates
GET /:postId
Get reactions summary
Features: totals by type

System Capabilities Covered by APIs
Posts + media
Feed generation
Follow graph
Realtime notifications
Realtime messaging
Read receipts
Fanout notifications
Feed backfill
Cursor pagination
