import { HydratedDocument, Model, Schema, model } from "mongoose";

export interface ITypingProfileStats {
  sessionsCount: number;
  bestWpm: number;
  averageWpm: number;
  bestAccuracy: number;
  averageAccuracy: number;
  totalCharactersTyped: number;
  totalCorrectCharacters: number;
  totalMistakes: number;
  totalActiveSeconds: number;
  lastSessionAt: Date | null;
}

export interface IMultiplayerProfileStats {
  racesCount: number;
  winsCount: number;
  podiumCount: number;
  bestRank: number | null;
  bestWpm: number;
  averageWpm: number;
  averageAccuracy: number;
  totalScore: number;
  lastRaceAt: Date | null;
}

export interface IEngagementProfileStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  activeDaysCount: number;
}

export interface IProgressionProfileStats {
  xp: number;
  level: number;
  levelProgressPercent: number;
  earnedBadgeCount: number;
}

export interface IPlayerProfileStats {
  userId: string;
  usernameSnapshot: string;
  displayNameSnapshot: string;
  typing: ITypingProfileStats;
  multiplayer: IMultiplayerProfileStats;
  engagement: IEngagementProfileStats;
  progression: IProgressionProfileStats;
  createdAt: Date;
  updatedAt: Date;
}

type PlayerProfileStatsModel = Model<IPlayerProfileStats>;
export type PlayerProfileStatsDocument = HydratedDocument<IPlayerProfileStats>;

const playerProfileStatsSchema = new Schema<IPlayerProfileStats, PlayerProfileStatsModel>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    usernameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    displayNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    typing: {
      sessionsCount: { type: Number, required: true, default: 0, min: 0 },
      bestWpm: { type: Number, required: true, default: 0, min: 0 },
      averageWpm: { type: Number, required: true, default: 0, min: 0 },
      bestAccuracy: { type: Number, required: true, default: 0, min: 0, max: 100 },
      averageAccuracy: { type: Number, required: true, default: 0, min: 0, max: 100 },
      totalCharactersTyped: { type: Number, required: true, default: 0, min: 0 },
      totalCorrectCharacters: { type: Number, required: true, default: 0, min: 0 },
      totalMistakes: { type: Number, required: true, default: 0, min: 0 },
      totalActiveSeconds: { type: Number, required: true, default: 0, min: 0 },
      lastSessionAt: { type: Date, default: null },
    },
    multiplayer: {
      racesCount: { type: Number, required: true, default: 0, min: 0 },
      winsCount: { type: Number, required: true, default: 0, min: 0 },
      podiumCount: { type: Number, required: true, default: 0, min: 0 },
      bestRank: { type: Number, default: null, min: 1 },
      bestWpm: { type: Number, required: true, default: 0, min: 0 },
      averageWpm: { type: Number, required: true, default: 0, min: 0 },
      averageAccuracy: { type: Number, required: true, default: 0, min: 0, max: 100 },
      totalScore: { type: Number, required: true, default: 0, min: 0 },
      lastRaceAt: { type: Date, default: null },
    },
    engagement: {
      currentStreak: { type: Number, required: true, default: 0, min: 0 },
      longestStreak: { type: Number, required: true, default: 0, min: 0 },
      lastActiveDay: { type: String, default: null, trim: true },
      activeDaysCount: { type: Number, required: true, default: 0, min: 0 },
    },
    progression: {
      xp: { type: Number, required: true, default: 0, min: 0 },
      level: { type: Number, required: true, default: 1, min: 1 },
      levelProgressPercent: { type: Number, required: true, default: 0, min: 0, max: 100 },
      earnedBadgeCount: { type: Number, required: true, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const PlayerProfileStats = model<IPlayerProfileStats, PlayerProfileStatsModel>(
  "PlayerProfileStats",
  playerProfileStatsSchema
);

export default PlayerProfileStats;
