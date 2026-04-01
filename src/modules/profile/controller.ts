import { Request, Response } from "express";

import {
  acceptFriendRequest,
  deleteFriendRequest,
  getProfileDashboard,
  removeFriend,
  searchProfileUsers,
  sendFriendRequest,
  updateProfile,
} from "./service.js";

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new Error("Unauthorized");
  }

  return req.userId;
}

function readBody<T extends Record<string, unknown>>(body: unknown): T {
  if (!body || typeof body !== "object") {
    return {} as T;
  }

  return body as T;
}

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return null;
}

function handleError(res: Response, error: unknown, fallbackMessage: string): void {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const status =
    message === "Unauthorized"
      ? 401
      : message.includes("not found") ||
          message.includes("required") ||
          message.includes("already") ||
          message.includes("cannot") ||
          message.includes("must be") ||
          message.includes("Invalid")
        ? 400
        : 500;

  res.status(status).json({ message });
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req);
    const profile = await getProfileDashboard(userId);
    res.status(200).json(profile);
  } catch (error) {
    handleError(res, error, "Failed to fetch profile");
  }
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req);
    const profile = await updateProfile(userId, readBody(req.body));
    res.status(200).json({ profile });
  } catch (error) {
    handleError(res, error, "Failed to update profile");
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req);
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const users = await searchProfileUsers(userId, query);
    res.status(200).json({ users });
  } catch (error) {
    handleError(res, error, "Failed to search users");
  }
}

export async function createFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    const requesterUserId = requireUserId(req);
    const body = readBody<{ targetUserId?: unknown }>(req.body);

    if (typeof body.targetUserId !== "string" || body.targetUserId.trim().length === 0) {
      res.status(400).json({ message: "targetUserId is required" });
      return;
    }

    const result = await sendFriendRequest(requesterUserId, body.targetUserId);
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error, "Failed to send friend request");
  }
}

export async function acceptRequest(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req);
    const requestId = readParam(req.params.requestId);

    if (!requestId) {
      res.status(400).json({ message: "requestId is required" });
      return;
    }

    await acceptFriendRequest(userId, requestId);
    res.status(200).json({ ok: true });
  } catch (error) {
    handleError(res, error, "Failed to accept friend request");
  }
}

export async function deleteRequest(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req);
    const requestId = readParam(req.params.requestId);

    if (!requestId) {
      res.status(400).json({ message: "requestId is required" });
      return;
    }

    await deleteFriendRequest(userId, requestId);
    res.status(200).json({ ok: true });
  } catch (error) {
    handleError(res, error, "Failed to remove friend request");
  }
}

export async function deleteFriend(req: Request, res: Response): Promise<void> {
  try {
    const userId = requireUserId(req);
    const friendUserId = readParam(req.params.friendUserId);

    if (!friendUserId) {
      res.status(400).json({ message: "friendUserId is required" });
      return;
    }

    await removeFriend(userId, friendUserId);
    res.status(200).json({ ok: true });
  } catch (error) {
    handleError(res, error, "Failed to remove friend");
  }
}
