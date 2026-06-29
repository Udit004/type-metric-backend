import { QueueManager } from '../queueManager.js';

export const GAMIFICATION_QUEUE_NAME = 'gamification-queue';

export class GamificationQueueHandler {
  public static async enqueueRebuild(userId: string) {
    return QueueManager.getQueue(GAMIFICATION_QUEUE_NAME).add('rebuild-profile', { userId });
  }
}
