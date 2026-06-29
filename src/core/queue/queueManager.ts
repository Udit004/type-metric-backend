import { Queue, QueueOptions } from 'bullmq';
import { connection } from './bullmq.js';

export class QueueManager {
  private static queues: Map<string, Queue> = new Map();

  /**
   * Initialize or retrieve an existing queue.
   */
  public static getQueue(name: string, defaultJobOptions?: QueueOptions['defaultJobOptions']): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: 100, // Keep last 100 failed jobs for debugging
          ...defaultJobOptions,
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  /**
   * Gracefully close all queues.
   */
  public static async closeAll(): Promise<void> {
    const promises = Array.from(this.queues.values()).map(q => q.close());
    await Promise.all(promises);
    this.queues.clear();
  }
}
