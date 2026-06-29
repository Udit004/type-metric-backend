import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// BullMQ strictly requires `ioredis`, so we use a separate connection
// specifically for BullMQ. We configure `maxRetriesPerRequest: null` 
// as required by BullMQ's underlying mechanisms.
export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('BullMQ Redis connection error:', err);
});
