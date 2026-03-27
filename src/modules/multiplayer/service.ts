import crypto from "crypto";

import {
  MultiplayerServerEvent,
  MultiplayerUser,
  PlayerSnapshot,
  ProgressUpdateInput,
  RaceResult,
  RoomSnapshot,
  RoomStatus,
} from "./types.js";
import { getRandomPrompt } from "./constants/typingPrompts.js";

const DEFAULT_DURATION_SECONDS = 60;
const COUNTDOWN_SECONDS = 5;
const WAITING_ROOM_TTL_MS = 30 * 60 * 1000;
const FINISHED_ROOM_TTL_MS = 2 * 60 * 1000;

interface InternalParticipant {
  userId: string;
  name: string;
  joinedAt: number;
  isConnected: boolean;
  progress: {
    typedCharacters: number;
    correctCharacters: number;
    mistakes: number;
    accuracy: number;
    wpm: number;
    finishedAt: number | null;
  };
}

interface InternalRoom {
  roomId: string;
  hostId: string;
  status: RoomStatus;
  promptText: string;
  durationSeconds: number;
  createdAt: number;
  startedAt: number | null;
  endsAt: number | null;
  participants: Map<string, InternalParticipant>;
  countdownInterval: NodeJS.Timeout | null;
  raceTickInterval: NodeJS.Timeout | null;
  raceTimeout: NodeJS.Timeout | null;
  waitingRoomExpiry: NodeJS.Timeout | null;
  finishedRoomExpiry: NodeJS.Timeout | null;
}

function createRoomId(): string {
  return crypto.randomBytes(4).toString("hex");
}

function initialProgress() {
  return {
    typedCharacters: 0,
    correctCharacters: 0,
    mistakes: 0,
    accuracy: 0,
    wpm: 0,
    finishedAt: null,
  };
}

export class MultiplayerRoomService {
  private rooms = new Map<string, InternalRoom>();
  private onEvent?: (event: MultiplayerServerEvent) => void;

  setEventListener(listener: (event: MultiplayerServerEvent) => void): void {
    this.onEvent = listener;
  }

  clearEventListener(): void {
    this.onEvent = undefined;
  }

  createRoom(user: MultiplayerUser, promptText?: string): RoomSnapshot {
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

    room.waitingRoomExpiry = setTimeout(() => {
      this.closeRoom(room.roomId, "waiting_timeout");
    }, WAITING_ROOM_TTL_MS);

    this.rooms.set(roomId, room);
    this.emitRoomState(room);

    return this.toSnapshot(room);
  }

  getRoom(roomId: string): RoomSnapshot | null {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    return this.toSnapshot(room);
  }

  isParticipant(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    return room.participants.has(userId);
  }

  joinRoom(roomId: string, user: MultiplayerUser): RoomSnapshot {
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

  leaveRoom(roomId: string, userId: string): RoomSnapshot | null {
    const room = this.requireRoom(roomId);

    room.participants.delete(userId);

    if (room.participants.size === 0) {
      this.closeRoom(roomId, "empty_room");
      return null;
    }

    if (room.hostId === userId) {
      const nextHost = room.participants.values().next().value as
        | InternalParticipant
        | undefined;

      if (nextHost) {
        room.hostId = nextHost.userId;
      }
    }

    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  reconnectUser(roomId: string, userId: string): RoomSnapshot {
    const room = this.requireRoom(roomId);
    const participant = room.participants.get(userId);

    if (!participant) {
      throw new Error("You are not part of this room");
    }

    participant.isConnected = true;
    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  markDisconnected(userId: string): void {
    for (const room of this.rooms.values()) {
      const participant = room.participants.get(userId);

      if (!participant) {
        continue;
      }

      participant.isConnected = false;
      this.emitRoomState(room);
    }
  }

  startRace(roomId: string, userId: string): RoomSnapshot {
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

    if (room.waitingRoomExpiry) {
      clearTimeout(room.waitingRoomExpiry);
      room.waitingRoomExpiry = null;
    }

    let remainingSeconds = COUNTDOWN_SECONDS;
    this.emit({
      type: "race:countdown",
      roomId: room.roomId,
      remainingSeconds,
    });

    room.countdownInterval = setInterval(() => {
      remainingSeconds -= 1;

      if (remainingSeconds > 0) {
        this.emit({
          type: "race:countdown",
          roomId: room.roomId,
          remainingSeconds,
        });
        return;
      }

      if (room.countdownInterval) {
        clearInterval(room.countdownInterval);
        room.countdownInterval = null;
      }

      this.beginRace(room);
    }, 1000);

    this.emitRoomState(room);
    return this.toSnapshot(room);
  }

  private prepareRoomForNextRace(room: InternalRoom): void {
    if (room.finishedRoomExpiry) {
      clearTimeout(room.finishedRoomExpiry);
      room.finishedRoomExpiry = null;
    }

    room.promptText = getRandomPrompt();
    room.startedAt = null;
    room.endsAt = null;

    room.participants.forEach((participant) => {
      participant.progress = initialProgress();
    });
  }

  updateProgress(roomId: string, userId: string, input: ProgressUpdateInput): RoomSnapshot {
    const room = this.requireRoom(roomId);

    if (room.status !== "racing") {
      throw new Error("Race is not active");
    }

    const participant = room.participants.get(userId);

    if (!participant) {
      throw new Error("You are not part of this room");
    }

    this.validateProgress(input, participant.progress);

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

    room.raceTickInterval = setInterval(() => {
      const remainingMs = Math.max(0, (room.endsAt ?? Date.now()) - Date.now());
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      this.emit({
        type: "race:tick",
        roomId: room.roomId,
        remainingSeconds,
        endsAt: room.endsAt ?? Date.now(),
      });
    }, 1000);

    room.raceTimeout = setTimeout(() => {
      this.finishRace(room);
    }, room.durationSeconds * 1000);

    this.emitRoomState(room);
  }

  private finishRace(room: InternalRoom): void {
    if (room.status === "finished") {
      return;
    }

    room.status = "finished";

    if (room.raceTickInterval) {
      clearInterval(room.raceTickInterval);
      room.raceTickInterval = null;
    }

    if (room.raceTimeout) {
      clearTimeout(room.raceTimeout);
      room.raceTimeout = null;
    }

    if (room.countdownInterval) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
    }

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

    room.finishedRoomExpiry = setTimeout(() => {
      this.closeRoom(room.roomId, "finished_ttl");
    }, FINISHED_ROOM_TTL_MS);
  }

  private buildResults(room: InternalRoom): RaceResult[] {
    const ranked = Array.from(room.participants.values())
      .sort((a, b) => {
        if (b.progress.typedCharacters !== a.progress.typedCharacters) {
          return b.progress.typedCharacters - a.progress.typedCharacters;
        }

        if (b.progress.accuracy !== a.progress.accuracy) {
          return b.progress.accuracy - a.progress.accuracy;
        }

        const aFinished = a.progress.finishedAt ?? Number.MAX_SAFE_INTEGER;
        const bFinished = b.progress.finishedAt ?? Number.MAX_SAFE_INTEGER;

        if (aFinished !== bFinished) {
          return aFinished - bFinished;
        }

        return a.joinedAt - b.joinedAt;
      })
      .map((participant, index) => ({
        userId: participant.userId,
        name: participant.name,
        rank: index + 1,
        typedCharacters: participant.progress.typedCharacters,
        correctCharacters: participant.progress.correctCharacters,
        mistakes: participant.progress.mistakes,
        accuracy: participant.progress.accuracy,
        wpm: participant.progress.wpm,
        finishedAt: participant.progress.finishedAt,
      }));

    return ranked;
  }

  closeRoom(roomId: string, reason: string): void {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    if (room.waitingRoomExpiry) {
      clearTimeout(room.waitingRoomExpiry);
    }

    if (room.countdownInterval) {
      clearInterval(room.countdownInterval);
    }

    if (room.raceTickInterval) {
      clearInterval(room.raceTickInterval);
    }

    if (room.raceTimeout) {
      clearTimeout(room.raceTimeout);
    }

    if (room.finishedRoomExpiry) {
      clearTimeout(room.finishedRoomExpiry);
    }

    this.rooms.delete(roomId);
    this.emit({ type: "room:closed", roomId, reason });
  }

  private requireRoom(roomId: string): InternalRoom {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    return room;
  }

  private toSnapshot(room: InternalRoom): RoomSnapshot {
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

  private validateProgress(
    input: ProgressUpdateInput,
    previous: InternalParticipant["progress"]
  ): void {
    const numericFields = [
      input.typedCharacters,
      input.correctCharacters,
      input.mistakes,
      input.accuracy,
      input.wpm,
    ];

    if (numericFields.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("Progress fields must be non-negative numbers");
    }

    if (!Number.isInteger(input.typedCharacters) || !Number.isInteger(input.correctCharacters)) {
      throw new Error("typedCharacters and correctCharacters must be integers");
    }

    if (!Number.isInteger(input.mistakes)) {
      throw new Error("mistakes must be an integer");
    }

    if (input.correctCharacters > input.typedCharacters) {
      throw new Error("correctCharacters cannot be greater than typedCharacters");
    }

    if (input.accuracy > 100) {
      throw new Error("accuracy cannot exceed 100");
    }

    if (input.wpm > 350) {
      throw new Error("wpm is unrealistically high");
    }

    if (input.typedCharacters < previous.typedCharacters) {
      throw new Error("typedCharacters cannot decrease");
    }

    if (input.correctCharacters < previous.correctCharacters) {
      throw new Error("correctCharacters cannot decrease");
    }
  }

  private emitRoomState(room: InternalRoom): void {
    this.emit({
      type: "room:state",
      room: this.toSnapshot(room),
    });
  }

  private emit(event: MultiplayerServerEvent): void {
    this.onEvent?.(event);
  }
}

export const multiplayerRoomService = new MultiplayerRoomService();
