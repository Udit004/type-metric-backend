import TypingSession, {
  CompletionReason,
} from "../../models/TypingSession.model.js";
import { eventBus } from "../../core/events/eventBus.js";
import { Events } from "../../core/events/eventNames.js";

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
  shareId: string;
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

  // Trigger background updates asynchronously
  eventBus.emit(Events.TYPING_COMPLETED, {
    userId: payload.userId,
    sessionId: String(session._id),
  });

  return {
    id: String(session._id),
    userId: String(session.user),
    wpm: session.wpm,
    accuracy: session.accuracy,
    mistakes: session.mistakes,
    elapsedMs: session.elapsedMs,
    createdAt: session.createdAt,
    shareId: session.shareId,
  };
}

export interface SharedTypingSessionResponse {
  username: string;
  avatar: string | null;
  wpm: number;
  accuracy: number;
  consistency: number;
  rawWpm: number;
  duration: number;
  language: string;
  createdAt: Date;
  shareUrl: string;
}

export async function getSharedSession(shareId: string): Promise<SharedTypingSessionResponse | null> {
  const session = await TypingSession.findOne({ shareId, isPublic: true }).populate("user", "username avatarImageUrl");
  if (!session) {
    return null;
  }
  
  const user = session.user as any;
  const username = user?.username || "Unknown";
  const avatar = user?.avatarImageUrl || null;

  return {
    username,
    avatar,
    wpm: session.wpm,
    accuracy: session.accuracy,
    consistency: 100, // Fallback since it's not tracked
    rawWpm: session.wpm, // Fallback
    duration: session.durationSeconds,
    language: "english", // Fallback
    createdAt: session.createdAt,
    shareUrl: `https://typemetric.vercel.app/result/${session.shareId}`,
  };
}
