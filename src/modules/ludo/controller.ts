import { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";

import { LudoService } from "./service/ludo.service.js";
import { LudoRoomsStore } from "./state/rooms-store.js";

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRoomCode6(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return out;
}

import { sharedLudoStore as store, sharedLudoService as service } from "./service/ludo.service.js";

async function requireUser(req: Request): Promise<{ userId: string; name: string }> {
  if (!req.userId) throw new AppError(401, "Unauthorized");

  const user = await (await import("../../models/User.model.js")).default.findById(req.userId)
    .select("name")
    .lean();

  if (!user) throw new AppError(401, "Unauthorized");

  return { userId: req.userId, name: user.name };
}

function readBody(body: unknown): { roomId?: unknown; player_count?: unknown } {
  if (!body || typeof body !== "object") return {};
  return body as { roomId?: unknown; player_count?: unknown };
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const user = await requireUser(req);
  const body = readBody(req.body);

  const requestedRoomId = typeof body.roomId === "string" && body.roomId.trim().length > 0 ? body.roomId.trim() : undefined;
  const roomId = requestedRoomId ?? generateRoomCode6();

  const requestedPlayerCount = typeof body.player_count === "number" ? body.player_count : undefined;
  const player_count = requestedPlayerCount != null ? requestedPlayerCount : 2;

  const safePlayerCount = Math.max(2, Math.min(4, Math.floor(player_count)));

  const room = service.createRoom(roomId, { userId: user.userId, name: user.name }, safePlayerCount);

  res.status(201).json({ roomId: room.roomId, hostId: room.hostId });
}

export async function joinRoom(req: Request, res: Response): Promise<void> {
  const user = await requireUser(req);
  const roomId = typeof req.params.roomId === "string" ? req.params.roomId : null;

  if (!roomId) {
    throw new AppError(400, "roomId is required");
  }

  try {
    service.joinRoom(roomId, { userId: user.userId, name: user.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join room";
    throw new AppError(400, message);
  }

  res.status(200).json({ roomId, ok: true });
}
