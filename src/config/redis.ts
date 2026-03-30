import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

let redisClient: AppRedisClient | null = null;
let redisConnectPromise: Promise<void> | null = null;
let hasWarnedMissingRedisUrl = false;

function getRedisUrl(): string | null {
  return process.env.REDIS_URL ?? null;
}

function createRedisConnection(redisUrl: string): AppRedisClient {
  const client = createClient({
    url: redisUrl,
  });

  client.on("error", (error) => {
    console.error("Redis client error", error);
  });

  return client;
}

export function isRedisRecoverableError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (["EPIPE", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(code)) {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    message.includes("socket has been ended") ||
    message.includes("socket closed") ||
    message.includes("the client is closed")
  );
}

export function getRedisClient(): AppRedisClient | null {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const redisUrl = getRedisUrl();

  // Allow local/dev startup before Redis credentials are ready.
  if (!redisUrl) {
    if (!hasWarnedMissingRedisUrl) {
      console.warn("REDIS_URL is not set. Redis features are disabled.");
      hasWarnedMissingRedisUrl = true;
    }
    return;
  }

  if (redisClient?.isReady) {
    return;
  }

  if (redisConnectPromise) {
    await redisConnectPromise;
    return;
  }

  redisConnectPromise = (async () => {
    if (!redisClient) {
      redisClient = createRedisConnection(redisUrl);
    }

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  })();

  try {
    await redisConnectPromise;
    console.log("Redis connected");
  } finally {
    redisConnectPromise = null;
  }
}

export async function reconnectRedis(force = false): Promise<void> {
  if (force && redisClient) {
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    } catch {
      // Ignore close errors during forced recreation.
    } finally {
      redisClient = null;
    }
  }

  await connectRedis();
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient?.isOpen) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}
