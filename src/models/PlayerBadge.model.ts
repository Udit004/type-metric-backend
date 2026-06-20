import { HydratedDocument, Model, Schema, model } from "mongoose";

export interface IPlayerBadge {
  userId: string;
  badgeKey: string;
  awardedAt: Date | null;
  progressCurrent: number;
  progressTarget: number;
  isCompleted: boolean;
  lastProgressAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type PlayerBadgeModel = Model<IPlayerBadge>;
export type PlayerBadgeDocument = HydratedDocument<IPlayerBadge>;

const playerBadgeSchema = new Schema<IPlayerBadge, PlayerBadgeModel>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    badgeKey: {
      type: String,
      required: true,
      trim: true,
    },
    awardedAt: {
      type: Date,
      default: null,
    },
    progressCurrent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    progressTarget: {
      type: Number,
      required: true,
      min: 1,
    },
    isCompleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastProgressAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

playerBadgeSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });

const PlayerBadge = model<IPlayerBadge, PlayerBadgeModel>("PlayerBadge", playerBadgeSchema);

export default PlayerBadge;
