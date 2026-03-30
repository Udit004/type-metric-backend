import {
  connectRedis,
  getRedisClient,
  isRedisRecoverableError,
  reconnectRedis,
} from "../../../config/redis.js";
import { RoomSnapshot } from "../types.js";

const ROOM_CACHE_PREFIX = "multiplayer:room:";
const DEFAULT_ROOM_TTL_SECONDS = 60 * 60;

function buildRoomKey(roomId: string): string {
  return `${ROOM_CACHE_PREFIX}${roomId}`;
}

async function executeCacheOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (!isRedisRecoverableError(error)) {
      console.warn(`Redis cache ${operationName} failed`, error);
      return null;
    }

    try {
      await reconnectRedis(true);
      return await operation();
    } catch (retryError) {
      console.warn(`Redis cache ${operationName} retry failed`, retryError);
      return null;
    }
  }
}

export async function cacheRoomSnapshot(
  room: RoomSnapshot,
  ttlSeconds = DEFAULT_ROOM_TTL_SECONDS
): Promise<void> {
  await connectRedis();

  await executeCacheOperation("set", async () => {
    const redis = getRedisClient();

    if (!redis?.isOpen) {
      return null;
    }

    await redis.set(buildRoomKey(room.roomId), JSON.stringify(room), {
      EX: ttlSeconds,
    });

    return null;
  });
}

export async function getCachedRoomSnapshot(roomId: string): Promise<RoomSnapshot | null> {
  await connectRedis();

  const value = await executeCacheOperation("get", async () => {
    const redis = getRedisClient();

    if (!redis?.isOpen) {
      return null;
    }

    return redis.get(buildRoomKey(roomId));
  });

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as RoomSnapshot;
  } catch {
    return null;
  }
}

export async function removeCachedRoomSnapshot(roomId: string): Promise<void> {
  await connectRedis();

  await executeCacheOperation("del", async () => {
    const redis = getRedisClient();

    if (!redis?.isOpen) {
      return null;
    }

    await redis.del(buildRoomKey(roomId));
    return null;
  });
}
