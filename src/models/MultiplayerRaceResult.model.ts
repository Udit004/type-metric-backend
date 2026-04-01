import { HydratedDocument, Model, Schema, model } from "mongoose";

export interface IMultiplayerRaceResult {
  userId: string;
  name: string;
  roomId: string;
  raceNumber: number;
  rank: number;
  wpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  typedCharacters: number;
  score: number;
  finishedAt: number | null;
  createdAt: Date;
  updatedAt: Date;
}

type MultiplayerRaceResultModel = Model<IMultiplayerRaceResult>;
export type MultiplayerRaceResultDocument =
  HydratedDocument<IMultiplayerRaceResult>;

const multiplayerRaceResultSchema = new Schema<
  IMultiplayerRaceResult,
  MultiplayerRaceResultModel
>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roomId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    raceNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    wpm: {
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
    typedCharacters: {
      type: Number,
      required: true,
      min: 0,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    finishedAt: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

multiplayerRaceResultSchema.index({
  userId: 1,
  wpm: -1,
  accuracy: -1,
  createdAt: -1,
});

const MultiplayerRaceResult = model<
  IMultiplayerRaceResult,
  MultiplayerRaceResultModel
>("MultiplayerRaceResult", multiplayerRaceResultSchema);

export default MultiplayerRaceResult;
