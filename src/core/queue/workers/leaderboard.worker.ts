import { Job } from 'bullmq';
import { WorkerManager } from '../workerManager.js';
import { LEADERBOARD_QUEUE_NAME } from '../leaderboard/leaderboard.queue.js';
import { refreshLeaderboardSnapshots } from '../../../modules/leaderboard/service.js';
import logger from '../../logger/logger.js';

export async function processLeaderboardJob(job: Job) {
  logger.info({ jobId: job.id, name: job.name }, `Leaderboard Job Started: ${job.name}`);

  try {
    switch (job.name) {
      case 'refresh-snapshots':
        const { boards } = job.data;
        if (!boards || !Array.isArray(boards)) throw new Error("boards array is required for refresh-snapshots job");
        await refreshLeaderboardSnapshots(boards);
        break;
      default:
        logger.warn(`Unknown job name in leaderboard queue: ${job.name}`);
    }
    logger.info({ jobId: job.id, name: job.name }, `Leaderboard Job Completed: ${job.name}`);
  } catch (error) {
    logger.error({ jobId: job.id, name: job.name, error }, `Leaderboard Job Failed: ${job.name}`);
    throw error;
  }
}

export function startLeaderboardWorker() {
  return WorkerManager.startWorker(LEADERBOARD_QUEUE_NAME, processLeaderboardJob);
}
