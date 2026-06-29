import { Job } from 'bullmq';
import { WorkerManager } from '../workerManager.js';
import { ACTIVITY_QUEUE_NAME } from '../activity/activity.queue.js';
import { sendTelegramMessage } from '../../notifications/TelegramBot.js';
import logger from '../../logger/logger.js';

export async function processActivityJob(job: Job) {
  logger.info({ jobId: job.id, name: job.name }, `Activity Job Started: ${job.name}`);

  try {
    const { type, message, timestamp, metadata } = job.data;
    
    // Format the message for Telegram
    const emoji = (({
      INFO: 'ℹ️',
      WARNING: '⚠️',
      ERROR: '❌',
      CRITICAL: '🚨'
    }) as Record<string, string>)[type] || '📝';

    const dateStr = new Date(timestamp).toLocaleString();
    
    let formattedMessage = `*${emoji} System Activity*
`;
    formattedMessage += `*Type:* ${type}
`;
    formattedMessage += `*Time:* ${dateStr}
`;
    formattedMessage += `*Message:* ${message}
`;
    
    if (metadata) {
      formattedMessage += `${metadata ? `\nMetadata:\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`` : ''}`;
    }

    await sendTelegramMessage(formattedMessage);
    
    logger.info({ jobId: job.id }, `Activity notification sent to Telegram`);
  } catch (error) {
    logger.error({ jobId: job.id, error }, `Failed to send activity notification to Telegram`);
  }
}

export function startActivityWorker() {
  return WorkerManager.startWorker(ACTIVITY_QUEUE_NAME, processActivityJob);
}
