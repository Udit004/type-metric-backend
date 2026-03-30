import { RedisClientType, createClient } from "redis";

let redisClient: RedisClientType | null = null;

function getRedisUrl(): string | null {
  return process.env.REDIS_URL ?? null;
}

export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const redisUrl = getRedisUrl();

  // Allow local/dev startup before Redis credentials are ready.
  if (!redisUrl) {
    console.warn("REDIS_URL is not set. Redis features are disabled.");
    return;
  }

  if (redisClient?.isOpen) {
    return;
  }

  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (error) => {
    console.error("Redis client error", error);
  });

  await redisClient.connect();
  console.log("Redis connected");
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient?.isOpen) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}
