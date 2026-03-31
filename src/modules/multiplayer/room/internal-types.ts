import { RoomStatus } from "../types.js";

export interface InternalProgress {
  typedCharacters: number;
  correctCharacters: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
  finishedAt: number | null;
}

export interface InternalParticipant {
  userId: string;
  name: string;
  joinedAt: number;
  isConnected: boolean;
  progress: InternalProgress;
}

export interface InternalChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  sentAt: number;
}

export interface InternalRoom {
  roomId: string;
  hostId: string;
  status: RoomStatus;
  promptText: string;
  durationSeconds: number;
  createdAt: number;
  startedAt: number | null;
  endsAt: number | null;
  participants: Map<string, InternalParticipant>;
  chatMessages: InternalChatMessage[];
  countdownInterval: NodeJS.Timeout | null;
  raceTickInterval: NodeJS.Timeout | null;
  raceTimeout: NodeJS.Timeout | null;
  waitingRoomExpiry: NodeJS.Timeout | null;
  finishedRoomExpiry: NodeJS.Timeout | null;
}
