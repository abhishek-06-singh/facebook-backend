const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const feedController = require('./feed.controller');

const router = express.Router();

router.get('/', authMiddleware, feedController.getFeed);
router.get('/overview', authMiddleware, feedController.getFeedOverview);

module.exports = router;
