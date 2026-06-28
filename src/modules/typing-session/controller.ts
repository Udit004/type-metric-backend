import { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";

import { CompletionReason } from "../../models/TypingSession.model.js";
import { createTypingSession } from "./service.js";

interface SessionPayload {
  promptText?: string;
  typedText?: string;
  totalCharacters?: number;
  typedCharactersCount?: number;
  correctCharacters?: number;
  mistakes?: number;
  accuracy?: number;
  wpm?: number;
  elapsedMs?: number;
  durationSeconds?: number;
  completionReason?: CompletionReason;
}

function readBody(body: unknown): SessionPayload {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as SessionPayload;
}

function isValidCompletionReason(value: unknown): value is CompletionReason {
  return value === "time_up" || value === "text_completed";
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.userId) {
    throw new AppError(401, "Unauthorized");
  }

  const body = readBody(req.body);

  if (!body.promptText || typeof body.promptText !== "string") {
    throw new AppError(400, "promptText is required");
  }

  if (typeof body.typedText !== "string") {
    throw new AppError(400, "typedText is required");
  }

  if (
    !isNonNegativeNumber(body.totalCharacters) ||
    !Number.isInteger(body.totalCharacters) ||
    body.totalCharacters <= 0
  ) {
    throw new AppError(400, "totalCharacters must be a positive integer");
  }

  if (
    !isNonNegativeNumber(body.typedCharactersCount) ||
    !Number.isInteger(body.typedCharactersCount)
  ) {
    throw new AppError(400, "typedCharactersCount must be a non-negative integer");
  }

  if (
    !isNonNegativeNumber(body.correctCharacters) ||
    !Number.isInteger(body.correctCharacters)
  ) {
    throw new AppError(400, "correctCharacters must be a non-negative integer");
  }

  if (!isNonNegativeNumber(body.mistakes) || !Number.isInteger(body.mistakes)) {
    throw new AppError(400, "mistakes must be a non-negative integer");
  }

  if (!isNonNegativeNumber(body.accuracy) || body.accuracy > 100) {
    throw new AppError(400, "accuracy must be between 0 and 100");
  }

  if (!isNonNegativeNumber(body.wpm)) {
    throw new AppError(400, "wpm must be a non-negative number");
  }

  if (!isNonNegativeNumber(body.elapsedMs)) {
    throw new AppError(400, "elapsedMs must be a non-negative number");
  }

  if (
    !isNonNegativeNumber(body.durationSeconds) ||
    !Number.isInteger(body.durationSeconds) ||
    body.durationSeconds <= 0
  ) {
    throw new AppError(400, "durationSeconds must be a positive integer");
  }

  if (!isValidCompletionReason(body.completionReason)) {
    throw new AppError(400, "completionReason must be time_up or text_completed");
  }

  try {
    const session = await createTypingSession({
      userId: req.userId,
      promptText: body.promptText,
      typedText: body.typedText,
      totalCharacters: body.totalCharacters,
      typedCharactersCount: body.typedCharactersCount,
      correctCharacters: body.correctCharacters,
      mistakes: body.mistakes,
      accuracy: body.accuracy,
      wpm: body.wpm,
      elapsedMs: body.elapsedMs,
      durationSeconds: body.durationSeconds,
      completionReason: body.completionReason,
    });

    res.status(201).json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save typing session";
    throw new AppError(400, message);
  }
}