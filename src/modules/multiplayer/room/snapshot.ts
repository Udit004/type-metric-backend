import { PlayerSnapshot, RoomSnapshot } from "../types.js";
import { InternalRoom } from "./internal-types.js";

export function toRoomSnapshot(room: InternalRoom): RoomSnapshot {
  const participants: PlayerSnapshot[] = Array.from(room.participants.values())
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((participant) => ({
      userId: participant.userId,
      name: participant.name,
      isHost: participant.userId === room.hostId,
      isConnected: participant.isConnected,
      progress: {
        ...participant.progress,
      },
    }));

  return {
    roomId: room.roomId,
    status: room.status,
    hostId: room.hostId,
    promptText: room.promptText,
    durationSeconds: room.durationSeconds,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endsAt: room.endsAt,
    participants,
  };
}
