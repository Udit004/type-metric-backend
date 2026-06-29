import { Job } from 'bullmq';
import { WorkerManager } from '../workerManager.js';
import { NOTIFICATION_QUEUE_NAME } from '../notifications/notification.queue.js';
import { sendTelegramMessage } from '../../notifications/TelegramBot.js';
import logger from '../../logger/logger.js';

export async function processNotificationJob(job: Job) {
  logger.info({ jobId: job.id, name: job.name }, `Job Started: ${job.name}`);

  try {
    switch (job.name) {
      case 'telegram':
        await sendTelegramMessage(job.data.message);
        break;
      case 'email':
        // Implementation for email
        logger.info('Email notification job triggered (not fully implemented)');
        break;
      case 'discord':
        // Implementation for discord
        logger.info('Discord notification job triggered (not fully implemented)');
        break;
      case 'push':
        // Implementation for push
        logger.info('Push notification job triggered (not fully implemented)');
        break;
      default:
        logger.warn(`Unknown job name in notification queue: ${job.name}`);
    }

    logger.info({ jobId: job.id, name: job.name }, `Job Completed: ${job.name}`);
  } catch (error) {
    logger.error({ jobId: job.id, name: job.name, error }, `Job Failed: ${job.name}`);
    throw error; // Throw error to trigger retries in BullMQ
  }
}

export function startNotificationWorker() {
  return WorkerManager.startWorker(NOTIFICATION_QUEUE_NAME, processNotificationJob);
}
