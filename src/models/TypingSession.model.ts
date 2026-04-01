import { HydratedDocument, Model, Schema, Types, model } from "mongoose";

export type CompletionReason = "time_up" | "text_completed";

export interface ITypingSession {
  user: Types.ObjectId;
  promptText: string;
  typedText: string;
  totalCharacters: number;
  typedCharactersCount: number;
  correctCharacters: number;
  mistakes: number;
  accuracy: number;
  wpm: number;
  elapsedMs: number;
  durationSeconds: number;
  completionReason: CompletionReason;
  createdAt: Date;
  updatedAt: Date;
}

type TypingSessionModel = Model<ITypingSession>;
export type TypingSessionDocument = HydratedDocument<ITypingSession>;

const typingSessionSchema = new Schema<ITypingSession, TypingSessionModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    promptText: {
      type: String,
      required: true,
      trim: true,
    },
    typedText: {
      type: String,
      required: true,
      default: "",
    },
    totalCharacters: {
      type: Number,
      required: true,
      min: 1,
    },
    typedCharactersCount: {
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
    elapsedMs: {
      type: Number,
      required: true,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
    },
    completionReason: {
      type: String,
      enum: ["time_up", "text_completed"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

typingSessionSchema.index({ user: 1, createdAt: -1 });
typingSessionSchema.index({
  user: 1,
  wpm: -1,
  accuracy: -1,
  createdAt: -1,
});

const TypingSession = model<ITypingSession, TypingSessionModel>(
  "TypingSession",
  typingSessionSchema
);

export default TypingSession;
