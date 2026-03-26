import { Request, Response } from "express";

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
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const body = readBody(req.body);

    if (!body.promptText || typeof body.promptText !== "string") {
      res.status(400).json({ message: "promptText is required" });
      return;
    }

    if (typeof body.typedText !== "string") {
      res.status(400).json({ message: "typedText is required" });
      return;
    }

    if (
      !isNonNegativeNumber(body.totalCharacters) ||
      !Number.isInteger(body.totalCharacters) ||
      body.totalCharacters <= 0
    ) {
      res.status(400).json({ message: "totalCharacters must be a positive integer" });
      return;
    }

    if (
      !isNonNegativeNumber(body.typedCharactersCount) ||
      !Number.isInteger(body.typedCharactersCount)
    ) {
      res.status(400).json({ message: "typedCharactersCount must be a non-negative integer" });
      return;
    }

    if (
      !isNonNegativeNumber(body.correctCharacters) ||
      !Number.isInteger(body.correctCharacters)
    ) {
      res.status(400).json({ message: "correctCharacters must be a non-negative integer" });
      return;
    }

    if (!isNonNegativeNumber(body.mistakes) || !Number.isInteger(body.mistakes)) {
      res.status(400).json({ message: "mistakes must be a non-negative integer" });
      return;
    }

    if (!isNonNegativeNumber(body.accuracy) || body.accuracy > 100) {
      res.status(400).json({ message: "accuracy must be between 0 and 100" });
      return;
    }

    if (!isNonNegativeNumber(body.wpm)) {
      res.status(400).json({ message: "wpm must be a non-negative number" });
      return;
    }

    if (!isNonNegativeNumber(body.elapsedMs)) {
      res.status(400).json({ message: "elapsedMs must be a non-negative number" });
      return;
    }

    if (
      !isNonNegativeNumber(body.durationSeconds) ||
      !Number.isInteger(body.durationSeconds) ||
      body.durationSeconds <= 0
    ) {
      res.status(400).json({ message: "durationSeconds must be a positive integer" });
      return;
    }

    if (!isValidCompletionReason(body.completionReason)) {
      res.status(400).json({ message: "completionReason must be time_up or text_completed" });
      return;
    }

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
    const message =
      error instanceof Error ? error.message : "Failed to save typing session";
    res.status(400).json({ message });
  }
}