import { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import * as NotificationService from "./service.js";

export async function getMyNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await NotificationService.getNotificationsForUser(userId, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    throw new AppError(500, message);
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await NotificationService.markNotificationAsRead(id as string);
    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark as read";
    throw new AppError(500, message);
  }
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await NotificationService.markAllNotificationsAsRead(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark all as read";
    throw new AppError(500, message);
  }
}
