import { QueueManager } from '../queueManager.js';

export const LEADERBOARD_QUEUE_NAME = 'leaderboard-queue';

export class LeaderboardQueueHandler {
  public static async enqueueRefresh() {
    return QueueManager.getQueue(LEADERBOARD_QUEUE_NAME).add('refresh-snapshots', { 
        boards: ["solo", "combined"] 
    });
  }
}
