import MultiplayerRaceResult from "../../../models/MultiplayerRaceResult.model.js";
import MultiplayerRoom from "../../../models/MultiplayerRoom.model.js";
import { enqueueLeaderboardRefresh } from "../../leaderboard/queue.js";
import { RaceResult } from "../types.js";
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

export async function appendFinishedRace(
  room: InternalRoom,
  endedAtMs: number,
  results: RaceResult[]
): Promise<void> {
  const winnerUserId = results[0]?.userId ?? null;

  const roomDoc = await MultiplayerRoom.findOne({ roomId: room.roomId })
    .select("raceCount")
    .lean();

  const nextRaceNumber = (roomDoc?.raceCount ?? 0) + 1;
  const createdAt = new Date(endedAtMs);

  await Promise.all([
    MultiplayerRoom.updateOne(
      { roomId: room.roomId },
      {
        $set: {
          hostId: room.hostId,
          status: room.status,
          promptText: room.promptText,
          durationSeconds: room.durationSeconds,
          startedAt: room.startedAt ? new Date(room.startedAt) : null,
          endedAt: new Date(endedAtMs),
          participants: toParticipants(room),
        },
        $setOnInsert: {
          roomId: room.roomId,
        },
        $inc: {
          raceCount: 1,
        },
        $push: {
          raceHistory: {
            raceNumber: nextRaceNumber,
            promptText: room.promptText,
            durationSeconds: room.durationSeconds,
            startedAt: room.startedAt ? new Date(room.startedAt) : null,
            endedAt: new Date(endedAtMs),
            winnerUserId,
            results,
          },
        },
      },
      { upsert: true }
    ),
    MultiplayerRaceResult.insertMany(
      results.map((result) => ({
        userId: result.userId,
        name: result.name,
        roomId: room.roomId,
        raceNumber: nextRaceNumber,
        wpm: result.wpm,
        accuracy: result.accuracy,
        mistakes: result.mistakes,
        correctCharacters: result.correctCharacters,
        typedCharacters: result.typedCharacters,
        score: result.score,
        finishedAt: result.finishedAt,
        createdAt,
        updatedAt: createdAt,
      }))
    ),
  ]);

  try {
    await Promise.all([
      enqueueLeaderboardRefresh("multiplayer"),
      enqueueLeaderboardRefresh("combined"),
    ]);
  } catch (error) {
    console.error("Failed to enqueue leaderboard refresh after multiplayer race", error);
  }
}
