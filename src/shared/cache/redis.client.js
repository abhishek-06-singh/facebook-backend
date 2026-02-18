const Redis = require('ioredis');

let redisClient;

const getRedisClient = () => {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not set');
  }

  redisClient = new Redis(redisUrl);
  return redisClient;
};

const safeGetRedisClient = () => {
  try {
    return getRedisClient();
  } catch (error) {
    return null;
  }
};

module.exports = {
  getRedisClient,
  safeGetRedisClient,
};
