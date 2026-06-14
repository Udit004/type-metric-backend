import { Request, Response } from "express";

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

// Create a process-local store/service for REST calls.
// This matches the in-memory approach used by the websocket handlers.
import { sharedLudoStore as store, sharedLudoService as service } from "./service/ludo.service.js";

async function requireUser(req: Request): Promise<{ userId: string; name: string }> {
  if (!req.userId) throw new Error("Unauthorized");

  // requireAuth only guarantees req.userId in your current middleware.
  // Fetch user name from DB.
  const user = await (await import("../../models/User.model.js")).default.findById(req.userId)
    .select("name")
    .lean();

  if (!user) throw new Error("Unauthorized");

  return { userId: req.userId, name: user.name };
}

function readBody(body: unknown): { roomId?: unknown; player_count?: unknown } {
  if (!body || typeof body !== "object") return {};
  return body as { roomId?: unknown; player_count?: unknown };
}



export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = await requireUser(req);
    const body = readBody(req.body);

    const requestedRoomId = typeof body.roomId === "string" && body.roomId.trim().length > 0 ? body.roomId.trim() : undefined;

    // If host provides roomId, trust it. Otherwise generate a simple 6-char code.
    const roomId = requestedRoomId ?? generateRoomCode6();




    // Capacity enforcement (authoritative on backend)
    // Accept only sensible player counts.
    const requestedPlayerCount = typeof body.player_count === "number" ? body.player_count : undefined;
    const player_count = requestedPlayerCount != null ? requestedPlayerCount : 2;

    const safePlayerCount = Math.max(2, Math.min(4, Math.floor(player_count)));

    const room = service.createRoom(roomId, { userId: user.userId, name: user.name }, safePlayerCount);


    res.status(201).json({ roomId: room.roomId, hostId: room.hostId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create room";
    const status = message === "Unauthorized" ? 401 : 400;
    res.status(status).json({ message });
  }
}

export async function joinRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = await requireUser(req);
    const roomId = typeof req.params.roomId === "string" ? req.params.roomId : null;

    if (!roomId) {
      res.status(400).json({ message: "roomId is required" });
      return;
    }

    service.joinRoom(roomId, { userId: user.userId, name: user.name });

    // Minimal response for Godot to get the room id / basic join ack.
    res.status(200).json({ roomId, ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join room";
    const status = message === "Unauthorized" ? 401 : 400;
    res.status(status).json({ message });
  }
}

