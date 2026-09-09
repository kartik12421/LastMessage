const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) {
      console.error('Redis connection exhausted retries. Is Redis running? (try: docker run -d --name redis -p 6379:6379 redis:7-alpine)');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

module.exports = redis;
