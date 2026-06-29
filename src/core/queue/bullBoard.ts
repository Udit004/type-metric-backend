import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { notificationQueue } from './notifications/notification.queue.js';

// Setup Bull Board adapter for Express
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create the Bull Board using the queues we have
createBullBoard({
  queues: [
    new BullMQAdapter(notificationQueue),
  ],
  serverAdapter: serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();
