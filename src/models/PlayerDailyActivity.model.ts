import { HydratedDocument, Model, Schema, model } from "mongoose";

export interface IPlayerDailyActivity {
  userId: string;
  activityDate: string;
  timezone: string;
  typingSessionsCount: number;
  multiplayerRacesCount: number;
  charactersTyped: number;
  correctCharacters: number;
  mistakes: number;
  activeSeconds: number;
  xpEarned: number;
  bestWpm: number;
  bestAccuracy: number;
  completedDay: boolean;
  heatScore: number;
  firstActivityAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type PlayerDailyActivityModel = Model<IPlayerDailyActivity>;
export type PlayerDailyActivityDocument = HydratedDocument<IPlayerDailyActivity>;

const playerDailyActivitySchema = new Schema<IPlayerDailyActivity, PlayerDailyActivityModel>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    activityDate: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      default: "UTC",
    },
    typingSessionsCount: { type: Number, required: true, default: 0, min: 0 },
    multiplayerRacesCount: { type: Number, required: true, default: 0, min: 0 },
    charactersTyped: { type: Number, required: true, default: 0, min: 0 },
    correctCharacters: { type: Number, required: true, default: 0, min: 0 },
    mistakes: { type: Number, required: true, default: 0, min: 0 },
    activeSeconds: { type: Number, required: true, default: 0, min: 0 },
    xpEarned: { type: Number, required: true, default: 0, min: 0 },
    bestWpm: { type: Number, required: true, default: 0, min: 0 },
    bestAccuracy: { type: Number, required: true, default: 0, min: 0, max: 100 },
    completedDay: { type: Boolean, required: true, default: false },
    heatScore: { type: Number, required: true, default: 0, min: 0, max: 4 },
    firstActivityAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

playerDailyActivitySchema.index({ userId: 1, activityDate: 1 }, { unique: true });
playerDailyActivitySchema.index({ userId: 1, lastActivityAt: -1 });

const PlayerDailyActivity = model<IPlayerDailyActivity, PlayerDailyActivityModel>(
  "PlayerDailyActivity",
  playerDailyActivitySchema
);

export default PlayerDailyActivity;
