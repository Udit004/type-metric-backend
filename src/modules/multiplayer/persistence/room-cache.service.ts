import { getRedisClient } from "../../../config/redis.js";
import { RoomSnapshot } from "../types.js";

const ROOM_CACHE_PREFIX = "multiplayer:room:";
const DEFAULT_ROOM_TTL_SECONDS = 60 * 60;

function buildRoomKey(roomId: string): string {
  return `${ROOM_CACHE_PREFIX}${roomId}`;
}

export async function cacheRoomSnapshot(
  room: RoomSnapshot,
  ttlSeconds = DEFAULT_ROOM_TTL_SECONDS
): Promise<void> {
  const redis = getRedisClient();

  if (!redis?.isOpen) {
    return;
  }

  await redis.set(buildRoomKey(room.roomId), JSON.stringify(room), {
    EX: ttlSeconds,
  });
}

export async function getCachedRoomSnapshot(roomId: string): Promise<RoomSnapshot | null> {
  const redis = getRedisClient();

  if (!redis?.isOpen) {
    return null;
  }

  const value = await redis.get(buildRoomKey(roomId));

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
  const redis = getRedisClient();

  if (!redis?.isOpen) {
    return;
  }

  await redis.del(buildRoomKey(roomId));
}
