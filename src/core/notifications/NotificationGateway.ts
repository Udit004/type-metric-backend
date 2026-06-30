import { WebSocketServer } from "ws";
import { createNotification } from "../../modules/notifications/service.js";
import { messaging } from "../../config/firebaseAdmin.js";
import User from "../../models/User.model.js";

export class NotificationGateway {
  private static wss: WebSocketServer | null = null;
  private static contexts: Map<any, any> | null = null;

  public static setServer(wss: WebSocketServer, contexts: Map<any, any>) {
    this.wss = wss;
    this.contexts = contexts;
  }

  public static async sendNotification(userId: string, notificationData: {
    type: string;
    message: string;
    metadata?: any;
  }) {
    // 1. Persist to database first
    const notification = await createNotification({
      recipientId: userId,
      type: notificationData.type as any,
      message: notificationData.message,
      metadata: notificationData.metadata,
    });

    // 2. Attempt real-time delivery if user is online
    if (this.contexts) {
      this.contexts.forEach((context, socket) => {
        if (context.user.userId === userId && socket.readyState === 1) { // 1 === WebSocket.OPEN
          socket.send(JSON.stringify({
            type: "notification:new",
            payload: notification,
          }));
        }
      });
    }

    // 3. Send FCM push notification
    try {
      const user = await User.findById(userId).select("fcmTokens").lean();
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        const payload = {
          notification: {
            title: "Typemetric",
            body: notificationData.message,
          },
          data: {
            type: notificationData.type,
            metadata: JSON.stringify(notificationData.metadata || {}),
          },
          tokens: user.fcmTokens,
        };
        const response = await messaging.sendEachForMulticast(payload);
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(user.fcmTokens[idx]);
            }
          });
          if (failedTokens.length > 0) {
            // Optional: Remove invalid tokens from the database
            await User.findByIdAndUpdate(userId, {
              $pullAll: { fcmTokens: failedTokens },
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to send FCM push notification:", error);
    }

    return notification;
  }
}
