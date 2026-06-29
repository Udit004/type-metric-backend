import { QueueManager } from '../queueManager.js';

export const NOTIFICATION_QUEUE_NAME = 'notification-queue';

// Instantiate the Notification Queue
export const notificationQueue = QueueManager.getQueue(NOTIFICATION_QUEUE_NAME);

export interface TelegramNotificationData {
  message: string;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
}

export interface DiscordNotificationData {
  message: string;
}

export interface PushNotificationData {
  title: string;
  body: string;
  token: string;
}

/**
 * Enqueue notification jobs using different job names.
 */
export class NotificationQueueHandler {
  public static async enqueueTelegram(data: TelegramNotificationData) {
    return notificationQueue.add('telegram', data);
  }

  public static async enqueueEmail(data: EmailNotificationData) {
    return notificationQueue.add('email', data);
  }

  public static async enqueueDiscord(data: DiscordNotificationData) {
    return notificationQueue.add('discord', data);
  }

  public static async enqueuePush(data: PushNotificationData) {
    return notificationQueue.add('push', data);
  }
}
