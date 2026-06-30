import { QueueManager } from '../queueManager.js';

export const ACTIVITY_QUEUE_NAME = 'activity-queue';

export interface ActivityLogData {
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ActivityQueueHandler {
  public static async enqueueActivity(data: ActivityLogData) {
    return QueueManager.getQueue(ACTIVITY_QUEUE_NAME).add('log-activity', data);
  }
}
