import TypingSession, {
  CompletionReason,
} from "../../models/TypingSession.model.js";
import { enqueueLeaderboardRefresh } from "../leaderboard/queue.js";

export interface CreateTypingSessionInput {
  userId: string;
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
}

export interface TypingSessionResponse {
  id: string;
  userId: string;
  wpm: number;
  accuracy: number;
  mistakes: number;
  elapsedMs: number;
  createdAt: Date;
}

export async function createTypingSession(
  payload: CreateTypingSessionInput
): Promise<TypingSessionResponse> {
  const session = await TypingSession.create({
    user: payload.userId,
    promptText: payload.promptText,
    typedText: payload.typedText,
    totalCharacters: payload.totalCharacters,
    typedCharactersCount: payload.typedCharactersCount,
    correctCharacters: payload.correctCharacters,
    mistakes: payload.mistakes,
    accuracy: payload.accuracy,
    wpm: payload.wpm,
    elapsedMs: payload.elapsedMs,
    durationSeconds: payload.durationSeconds,
    completionReason: payload.completionReason,
  });

  try {
    await Promise.all([
      enqueueLeaderboardRefresh("solo"),
      enqueueLeaderboardRefresh("combined"),
    ]);
  } catch (error) {
    console.error("Failed to enqueue leaderboard refresh after typing session", error);
  }

  return {
    id: String(session._id),
    userId: String(session.user),
    wpm: session.wpm,
    accuracy: session.accuracy,
    mistakes: session.mistakes,
    elapsedMs: session.elapsedMs,
    createdAt: session.createdAt,
  };
}
