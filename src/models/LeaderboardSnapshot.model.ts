import { HydratedDocument, Model, Schema, model } from "mongoose";

export type LeaderboardBoard = "combined" | "solo" | "multiplayer";
export type LeaderboardWindow = "all_time";
export type LeaderboardSourceMode = "single-player" | "multiplayer";

export interface ILeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  bestWpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  sourceMode: LeaderboardSourceMode;
  sourceId: string;
  achievedAt: Date;
}

export interface ILeaderboardSnapshot {
  board: LeaderboardBoard;
  window: LeaderboardWindow;
  generatedAt: Date;
  totalEntries: number;
  entries: ILeaderboardEntry[];
  createdAt: Date;
  updatedAt: Date;
}

type LeaderboardSnapshotModel = Model<ILeaderboardSnapshot>;
export type LeaderboardSnapshotDocument =
  HydratedDocument<ILeaderboardSnapshot>;

const leaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
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
    bestWpm: {
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
    mistakes: {
      type: Number,
      required: true,
      min: 0,
    },
    correctCharacters: {
      type: Number,
      required: true,
      min: 0,
    },
    sourceMode: {
      type: String,
      enum: ["single-player", "multiplayer"],
      required: true,
    },
    sourceId: {
      type: String,
      required: true,
      trim: true,
    },
    achievedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const leaderboardSnapshotSchema = new Schema<
  ILeaderboardSnapshot,
  LeaderboardSnapshotModel
>(
  {
    board: {
      type: String,
      enum: ["combined", "solo", "multiplayer"],
      required: true,
    },
    window: {
      type: String,
      enum: ["all_time"],
      required: true,
      default: "all_time",
    },
    generatedAt: {
      type: Date,
      required: true,
    },
    totalEntries: {
      type: Number,
      required: true,
      min: 0,
    },
    entries: {
      type: [leaderboardEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

leaderboardSnapshotSchema.index({ board: 1, window: 1 }, { unique: true });

const LeaderboardSnapshot = model<
  ILeaderboardSnapshot,
  LeaderboardSnapshotModel
>("LeaderboardSnapshot", leaderboardSnapshotSchema);

export default LeaderboardSnapshot;
