import MultiplayerRoom from "../../../models/MultiplayerRoom.model.js";
import { InternalRoom } from "../room/internal-types.js";

function toParticipants(room: InternalRoom) {
  return Array.from(room.participants.values()).map((participant) => ({
    userId: participant.userId,
    name: participant.name,
    joinedAt: new Date(participant.joinedAt),
    isConnected: participant.isConnected,
  }));
}

export async function upsertRoomState(room: InternalRoom): Promise<void> {
  const now = new Date();

  await MultiplayerRoom.updateOne(
    { roomId: room.roomId },
    {
      $set: {
        hostId: room.hostId,
        status: room.status,
        promptText: room.promptText,
        durationSeconds: room.durationSeconds,
        startedAt: room.startedAt ? new Date(room.startedAt) : null,
        endedAt: room.status === "finished" ? now : null,
        participants: toParticipants(room),
      },
      $setOnInsert: {
        roomId: room.roomId,
      },
    },
    { upsert: true }
  );
}

export async function markRoomClosed(roomId: string, reason: string): Promise<void> {
  await MultiplayerRoom.updateOne(
    { roomId },
    {
      $set: {
        closedReason: reason,
        endedAt: new Date(),
      },
    }
  );
}
