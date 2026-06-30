import { WebSocketServer } from "ws";
import { createNotification } from "../../modules/notifications/service.js";

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

    return notification;
  }
}
