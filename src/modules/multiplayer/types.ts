export type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

export interface PlayerProgress {
  typedCharacters: number;
  correctCharacters: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
  finishedAt: number | null;
}

export interface PlayerSnapshot {
  userId: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  progress: PlayerProgress;
}

export interface RoomSnapshot {
  roomId: string;
  status: RoomStatus;
  hostId: string;
  promptText: string;
  durationSeconds: number;
  createdAt: number;
  startedAt: number | null;
  endsAt: number | null;
  participants: PlayerSnapshot[];
}

export interface RaceResult {
  userId: string;
  name: string;
  rank: number;
  score: number;
  typedCharacters: number;
  correctCharacters: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
  finishedAt: number | null;
}

export interface MultiplayerUser {
  userId: string;
  name: string;
}

export interface ProgressUpdateInput {
  typedCharacters: number;
  correctCharacters: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
}

export type MultiplayerServerEvent =
  | {
      type: "room:state";
      room: RoomSnapshot;
    }
  | {
      type: "race:countdown";
      roomId: string;
      remainingSeconds: number;
    }
  | {
      type: "race:started";
      roomId: string;
      startedAt: number;
      endsAt: number;
      durationSeconds: number;
    }
  | {
      type: "race:tick";
      roomId: string;
      remainingSeconds: number;
      endsAt: number;
    }
  | {
      type: "race:finished";
      roomId: string;
      endedAt: number;
      winnerUserId: string | null;
      results: RaceResult[];
    }
  | {
      type: "room:closed";
      roomId: string;
      reason: string;
    };
