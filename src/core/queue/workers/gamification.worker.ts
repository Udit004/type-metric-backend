import { Job } from 'bullmq';
import { WorkerManager } from '../workerManager.js';
import { GAMIFICATION_QUEUE_NAME } from '../gamification/gamification.queue.js';
import { rebuildUserGamification } from '../../../modules/gamification/service.js';
import logger from '../../logger/logger.js';

export async function processGamificationJob(job: Job) {
  logger.info({ jobId: job.id, name: job.name }, `Gamification Job Started: ${job.name}`);

  try {
    switch (job.name) {
      case 'rebuild-profile':
        const { userId } = job.data;
        if (!userId) throw new Error("userId is required for rebuild-profile job");
        await rebuildUserGamification(userId);
        break;
      default:
        logger.warn(`Unknown job name in gamification queue: ${job.name}`);
    }
    logger.info({ jobId: job.id, name: job.name }, `Gamification Job Completed: ${job.name}`);
  } catch (error) {
    logger.error({ jobId: job.id, name: job.name, error }, `Gamification Job Failed: ${job.name}`);
    throw error;
  }
}

export function startGamificationWorker() {
  return WorkerManager.startWorker(GAMIFICATION_QUEUE_NAME, processGamificationJob);
}
