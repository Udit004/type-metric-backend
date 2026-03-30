import { HydratedDocument, Model, Schema, model } from "mongoose";

import { RoomStatus } from "../modules/multiplayer/types.js";

export interface IRoomParticipant {
  userId: string;
  name: string;
  joinedAt: Date;
  isConnected: boolean;
}

export interface IMultiplayerRoom {
  roomId: string;
  hostId: string;
  status: RoomStatus;
  promptText: string;
  durationSeconds: number;
  startedAt: Date | null;
  endedAt: Date | null;
  closedReason: string | null;
  participants: IRoomParticipant[];
  raceCount: number;
  raceHistory: IRaceHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRaceResultEntry {
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

export interface IRaceHistoryEntry {
  raceNumber: number;
  promptText: string;
  durationSeconds: number;
  startedAt: Date | null;
  endedAt: Date;
  winnerUserId: string | null;
  results: IRaceResultEntry[];
}

type MultiplayerRoomModel = Model<IMultiplayerRoom>;
export type MultiplayerRoomDocument = HydratedDocument<IMultiplayerRoom>;

const participantSchema = new Schema<IRoomParticipant>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    joinedAt: {
      type: Date,
      required: true,
    },
    isConnected: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false }
);

const raceResultSchema = new Schema<IRaceResultEntry>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    typedCharacters: {
      type: Number,
      required: true,
      min: 0,
    },
    correctCharacters: {
      type: Number,
      required: true,
      min: 0,
    },
    mistakes: {
      type: Number,
      required: true,
      min: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    wpm: {
      type: Number,
      required: true,
      min: 0,
    },
    finishedAt: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const raceHistorySchema = new Schema<IRaceHistoryEntry>(
  {
    raceNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    promptText: {
      type: String,
      required: true,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    winnerUserId: {
      type: String,
      default: null,
      trim: true,
    },
    results: {
      type: [raceResultSchema],
      default: [],
    },
  },
  { _id: false }
);

const multiplayerRoomSchema = new Schema<IMultiplayerRoom, MultiplayerRoomModel>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    hostId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["waiting", "countdown", "racing", "finished"],
      required: true,
      default: "waiting",
      index: true,
    },
    promptText: {
      type: String,
      required: true,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
      default: 60,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    closedReason: {
      type: String,
      default: null,
      trim: true,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    raceCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    raceHistory: {
      type: [raceHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

multiplayerRoomSchema.index({ createdAt: -1 });
multiplayerRoomSchema.index({ hostId: 1, createdAt: -1 });

const MultiplayerRoom = model<IMultiplayerRoom, MultiplayerRoomModel>(
  "MultiplayerRoom",
  multiplayerRoomSchema
);

export default MultiplayerRoom;
