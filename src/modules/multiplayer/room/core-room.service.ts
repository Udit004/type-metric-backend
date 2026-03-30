import crypto from "crypto";

import {
  MultiplayerServerEvent,
  MultiplayerUser,
  ProgressUpdateInput,
  RoomSnapshot,
} from "../types.js";
import { getRandomPrompt } from "../constants/typingPrompts.js";
import { buildRaceResults } from "../race/scoring.js";
import { validateProgressUpdate } from "../race/progress-validation.js";
import {
  clearAllRoomTimers,
  clearFinishedRoomExpiry,
  clearRaceLifecycleTimers,
  clearWaitingRoomExpiry,
  startCountdownTimer,
  startRaceRuntimeTimers,
} from "../race/timer-lifecycle.js";
import {
  cacheRoomSnapshot,
  removeCachedRoomSnapshot,
} from "../persistence/room-cache.service.js";
import {
  appendFinishedRace,
  markRoomClosed,
  upsertRoomState,
} from "../persistence/room-persistence.service.js";
import { InternalProgress, InternalRoom } from "./internal-types.js";
import { toRoomSnapshot } from "./snapshot.js";

const DEFAULT_DURATION_SECONDS = 60;
const COUNTDOWN_SECONDS = 5;

function createRoomId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function initialProgress(): InternalProgress {
  return {
    typedCharacters: 0,
    correctCharacters: 0,
    mistakes: 0,
    accuracy: 0,
    wpm: 0,
    finishedAt: null,
  };
}

/**
 * Core room service handles room state management, validation, and helper methods.
 * This service is shared by both REST and WebSocket layers via composition.
 */
export class CoreRoomService {
  protected rooms = new Map<string, InternalRoom>();
  protected onEvent?: (event: MultiplayerServerEvent) => void;

  setEventListener(listener: (event: MultiplayerServerEvent) => void): void {
    this.onEvent = listener;
  }

  clearEventListener(): void {
    this.onEvent = undefined;
  }

  // ============ Public API for REST operations ============

  createRoomForUser(user: MultiplayerUser, promptText?: string): RoomSnapshot {
    const roomId = createRoomId();
    const now = Date.now();

    const room: InternalRoom = {
      roomId,
      hostId: user.userId,
      status: "waiting",
      promptText: promptText?.trim() || getRandomPrompt(),
      durationSeconds: DEFAULT_DURATION_SECONDS,
      createdAt: now,
      startedAt: null,
      endsAt: null,
      participants: new Map(),
      countdownInterval: null,
      raceTickInterval: null,
      raceTimeout: null,
      waitingRoomExpiry: null,
      finishedRoomExpiry: null,
    };

    room.participants.set(user.userId, {
      userId: user.userId,
      name: user.name,
      joinedAt: now,
      isConnected: true,
      progress: initialProgress(),
    });

    this.rooms.set(roomId, room);
    this.emitRoomState(room);

    return this.toSnapshot(room);
  }

  getRoomSnapshot(roomId: string): RoomSnapshot | null {
    const room = this.rooms.get(roomId);
    return room ? this.toSnapshot(room) : null;
  }

  isUserParticipant(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.participants.has(userId) : false;
  }

  joinUserToRoom(roomId: string, user: MultiplayerUser): RoomSnapshot {
    const room = this.requireRoom(roomId);

    const existing = room.participants.get(user.userId);

    if (existing) {
      existing.isConnected = true;
      existing.name = user.name;
      this.emitRoomState(room);
      return this.toSnapshot(room);
    }

    if (room.status !== "waiting") {
      throw new Error("Room is not accepting new players");
    }

    room.participants.set(user.userId, {
      userId: user.userId,
      name: user.name,
      joinedAt: Date.now(),
      isConnected: true,
      progress: initialProgress(),
    });

    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  // ============ Public API for WebSocket operations ============

  startRaceInRoom(roomId: string, userId: string): RoomSnapshot {
    const room = this.requireRoom(roomId);

    if (room.hostId !== userId) {
      throw new Error("Only the room host can start the race");
    }

    if (room.status === "countdown" || room.status === "racing") {
      throw new Error("Race already started or finished");
    }

    if (room.participants.size < 2) {
      throw new Error("At least two players are required to start");
    }

    if (room.status === "finished") {
      this.prepareRoomForNextRace(room);
    }

    room.status = "countdown";

    clearWaitingRoomExpiry(room);

    startCountdownTimer(
      room,
      COUNTDOWN_SECONDS,
      (remainingSeconds) => {
        this.emit({
          type: "race:countdown",
          roomId: room.roomId,
          remainingSeconds,
        });
      },
      () => {
        this.beginRace(room);
      }
    );

    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  updatePlayerProgress(roomId: string, userId: string, input: ProgressUpdateInput): RoomSnapshot {
    const room = this.requireRoom(roomId);

    if (room.status !== "racing") {
      throw new Error("Race is not active");
    }

    const participant = room.participants.get(userId);

    if (!participant) {
      throw new Error("You are not part of this room");
    }

    validateProgressUpdate(input, participant.progress);

    participant.progress.typedCharacters = input.typedCharacters;
    participant.progress.correctCharacters = input.correctCharacters;
    participant.progress.mistakes = input.mistakes;
    participant.progress.accuracy = input.accuracy;
    participant.progress.wpm = input.wpm;

    if (
      participant.progress.finishedAt === null &&
      participant.progress.typedCharacters >= room.promptText.length
    ) {
      participant.progress.finishedAt = Date.now();
    }

    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  removeUserFromRoom(roomId: string, userId: string): RoomSnapshot | null {
    const room = this.requireRoom(roomId);
    const isHostLeaving = room.hostId === userId;

    room.participants.delete(userId);

    if (room.participants.size === 0) {
      this.closeRoomInternal(roomId, "empty_room");
      return null;
    }

    if (isHostLeaving) {
      this.closeRoomInternal(roomId, "host_left");
      return null;
    }

    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  reconnectUserToRoom(roomId: string, userId: string): RoomSnapshot {
    const room = this.requireRoom(roomId);
    const participant = room.participants.get(userId);

    if (!participant) {
      throw new Error("You are not part of this room");
    }

    participant.isConnected = true;
    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  markUserDisconnected(userId: string): void {
    for (const room of this.rooms.values()) {
      const participant = room.participants.get(userId);

      if (!participant) {
        continue;
      }

      if (room.hostId === userId) {
        this.closeRoomInternal(room.roomId, "host_disconnected");
        continue;
      }

      participant.isConnected = false;
      this.emitRoomState(room);
    }
  }

  // ============ Protected helper methods ============

  protected requireRoom(roomId: string): InternalRoom {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    return room;
  }

  protected toSnapshot(room: InternalRoom): RoomSnapshot {
    return toRoomSnapshot(room);
  }

  protected buildResults(room: InternalRoom) {
    return buildRaceResults(room);
  }

  protected prepareRoomForNextRace(room: InternalRoom): void {
    clearFinishedRoomExpiry(room);

    room.promptText = getRandomPrompt();
    room.startedAt = null;
    room.endsAt = null;

    room.participants.forEach((participant) => {
      participant.progress = initialProgress();
    });
  }

  protected closeRoomInternal(roomId: string, reason: string): void {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    clearAllRoomTimers(room);

    this.rooms.delete(roomId);
    this.emit({ type: "room:closed", roomId, reason });
    this.syncRoomClosedPersistence(roomId, reason);
  }

  private beginRace(room: InternalRoom): void {
    const startedAt = Date.now();
    const endsAt = startedAt + room.durationSeconds * 1000;

    room.status = "racing";
    room.startedAt = startedAt;
    room.endsAt = endsAt;

    room.participants.forEach((participant) => {
      participant.progress = initialProgress();
    });

    this.emit({
      type: "race:started",
      roomId: room.roomId,
      startedAt,
      endsAt,
      durationSeconds: room.durationSeconds,
    });

    startRaceRuntimeTimers(
      room,
      (remainingSeconds, raceEndsAt) => {
        this.emit({
          type: "race:tick",
          roomId: room.roomId,
          remainingSeconds,
          endsAt: raceEndsAt,
        });
      },
      () => {
        this.finishRace(room);
      }
    );

    this.emitRoomState(room);
  }

  private finishRace(room: InternalRoom): void {
    if (room.status === "finished") {
      return;
    }

    room.status = "finished";

    clearRaceLifecycleTimers(room);

    const endedAt = Date.now();
    const results = this.buildResults(room);

    this.emit({
      type: "race:finished",
      roomId: room.roomId,
      endedAt,
      winnerUserId: results[0]?.userId ?? null,
      results,
    });

    this.emitRoomState(room);

    this.syncFinishedRacePersistence(room, endedAt, results);

    room.finishedRoomExpiry = null;
  }

  protected emitRoomState(room: InternalRoom): void {
    const roomSnapshot = this.toSnapshot(room);

    this.syncRoomStatePersistence(room, roomSnapshot);

    this.emit({
      type: "room:state",
      room: roomSnapshot,
    });
  }

  protected emit(event: MultiplayerServerEvent): void {
    this.onEvent?.(event);
  }

  private syncRoomStatePersistence(room: InternalRoom, roomSnapshot: RoomSnapshot): void {
    void Promise.all([
      upsertRoomState(room),
      cacheRoomSnapshot(roomSnapshot),
    ]).catch((error) => {
      console.error(`Failed to persist room state for ${room.roomId}`, error);
    });
  }

  private syncRoomClosedPersistence(roomId: string, reason: string): void {
    void Promise.all([
      markRoomClosed(roomId, reason),
      removeCachedRoomSnapshot(roomId),
    ]).catch((error) => {
      console.error(`Failed to persist room close for ${roomId}`, error);
    });
  }

  private syncFinishedRacePersistence(
    room: InternalRoom,
    endedAt: number,
    results: ReturnType<CoreRoomService["buildResults"]>
  ): void {
    void appendFinishedRace(room, endedAt, results).catch((error) => {
      console.error(`Failed to append finished race for ${room.roomId}`, error);
    });
  }
}

// Singleton instance shared by all services
let coreRoomServiceInstance: CoreRoomService | null = null;

export function getCoreRoomService(): CoreRoomService {
  if (!coreRoomServiceInstance) {
    coreRoomServiceInstance = new CoreRoomService();
  }
  return coreRoomServiceInstance;
}

export const coreRoomService = getCoreRoomService();

export type { InternalRoom } from "./internal-types.js";
