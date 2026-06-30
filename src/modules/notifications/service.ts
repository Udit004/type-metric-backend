import { Types } from "mongoose";
import Notification, { INotification } from "../../models/Notification.model.js";

export interface CreateNotificationParams {
  recipientId: string | Types.ObjectId;
  senderId?: string | Types.ObjectId;
  type: INotification["type"];
  message: string;
  metadata?: Record<string, any>;
}

export async function createNotification({
  recipientId,
  senderId,
  type,
  message,
  metadata = {},
}: CreateNotificationParams): Promise<any> {
  const notification = await Notification.create({
    recipientId,
    senderId,
    type,
    message,
    metadata,
  });
  return notification;
}

export async function getNotificationsForUser(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ notifications: any[]; total: number }> {
  const [notifications, total] = await Promise.all([
    Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("senderId", "name displayName username"),
    Notification.countDocuments({ recipientId: userId }),
  ]);

  return { notifications, total };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await Notification.updateOne({ _id: notificationId }, { isRead: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
}
