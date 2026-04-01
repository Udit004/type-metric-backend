import { Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";

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
    throw new Error("Unauthorized");
  }

  const user = await User.findById(req.userId).select("name").lean();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    userId: req.userId,
    name: user.name,
  };
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
    throw new Error("Voice chat is not configured");
  }

  return { url, apiKey, apiSecret };
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = await requireUser(req);
    const body = readBody(req.body);

    const room = multiplayerRoomService.createRoom(user, body.promptText);

    res.status(201).json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    const status = message === "Unauthorized" ? 401 : 400;
    res.status(status).json({ message });
  }
}

export async function joinRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = await requireUser(req);
    const roomId = readRoomId(req);

    if (!roomId) {
      res.status(400).json({ message: "roomId is required" });
      return;
    }

    const room = multiplayerRoomService.joinRoom(roomId, user);

    res.status(200).json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join room";
    const status = message === "Unauthorized" ? 401 : 400;
    res.status(status).json({ message });
  }
}

export async function getRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = await requireUser(req);
    const roomId = readRoomId(req);

    if (!roomId) {
      res.status(400).json({ message: "roomId is required" });
      return;
    }

    const room = multiplayerRoomService.getRoom(roomId);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (!multiplayerRoomService.isParticipant(roomId, user.userId)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    res.status(200).json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    const status = message === "Unauthorized" ? 401 : 400;
    res.status(status).json({ message });
  }
}

export async function getRoomVoiceToken(req: Request, res: Response): Promise<void> {
  try {
    const user = await requireUser(req);
    const roomId = readRoomId(req);

    if (!roomId) {
      res.status(400).json({ message: "roomId is required" });
      return;
    }

    const room = multiplayerRoomService.getRoom(roomId);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (!multiplayerRoomService.isParticipant(roomId, user.userId)) {
      res.status(403).json({ message: "Forbidden" });
      return;
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
    const message = error instanceof Error ? error.message : "Failed to create voice token";
    const status = message === "Unauthorized" ? 401 : message === "Voice chat is not configured" ? 500 : 400;
    res.status(status).json({ message });
  }
}
