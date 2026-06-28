import { Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { AppError } from "../../shared/utils/AppError.js";

import User from "../../models/User.model.js";
import { multiplayerRoomService } from "./service.js";

function readBody(body: unknown): { promptText?: string } {
  if (!body || typeof body !== "object") {
    return {};
  }
  return body as { promptText?: string };
}

async function requireUser(req: Request): Promise<{ userId: string; name: string }> {
  if (!req.userId) {
    throw new AppError(401, "Unauthorized");
  }

  const user = await User.findById(req.userId).select("name").lean();

  if (!user) {
    throw new AppError(401, "Unauthorized");
  }

  return { userId: req.userId, name: user.name };
}

function readRoomId(req: Request): string | null {
  const roomId = req.params.roomId;
  if (typeof roomId !== "string" || roomId.trim().length === 0) {
    return null;
  }
  return roomId;
}

function readLivekitConfig(): { url: string; apiKey: string; apiSecret: string } {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!url || !apiKey || !apiSecret) {
    throw new AppError(500, "Voice chat is not configured");
  }

  return { url, apiKey, apiSecret };
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const user = await requireUser(req);
  const body = readBody(req.body);

  try {
    const room = multiplayerRoomService.createRoom(user, body.promptText);
    res.status(201).json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    throw new AppError(400, message);
  }
}

export async function joinRoom(req: Request, res: Response): Promise<void> {
  const user = await requireUser(req);
  const roomId = readRoomId(req);

  if (!roomId) {
    throw new AppError(400, "roomId is required");
  }

  try {
    const room = multiplayerRoomService.joinRoom(roomId, user);
    res.status(200).json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join room";
    throw new AppError(400, message);
  }
}

export async function getRoom(req: Request, res: Response): Promise<void> {
  const user = await requireUser(req);
  const roomId = readRoomId(req);

  if (!roomId) {
    throw new AppError(400, "roomId is required");
  }

  try {
    const room = multiplayerRoomService.getRoom(roomId);
    if (!room) {
      throw new AppError(404, "Room not found");
    }

    if (!multiplayerRoomService.isParticipant(roomId, user.userId)) {
      throw new AppError(403, "Forbidden");
    }

    res.status(200).json({ room });
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    throw new AppError(400, message);
  }
}

export async function getRoomVoiceToken(req: Request, res: Response): Promise<void> {
  const user = await requireUser(req);
  const roomId = readRoomId(req);

  if (!roomId) {
    throw new AppError(400, "roomId is required");
  }

  try {
    const room = multiplayerRoomService.getRoom(roomId);
    if (!room) {
      throw new AppError(404, "Room not found");
    }

    if (!multiplayerRoomService.isParticipant(roomId, user.userId)) {
      throw new AppError(403, "Forbidden");
    }

    const { url, apiKey, apiSecret } = readLivekitConfig();
    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.userId,
      name: user.name,
      ttl: "2h",
    });

    token.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    res.status(200).json({
      token: await token.toJwt(),
      url,
      roomId,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Failed to create voice token";
    throw new AppError(400, message);
  }
}
