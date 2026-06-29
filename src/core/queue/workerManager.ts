import { Worker, WorkerOptions, Processor } from 'bullmq';
import { connection } from './bullmq.js';
import logger from '../logger/logger.js';

export class WorkerManager {
  private static workers: Map<string, Worker> = new Map();

  /**
   * Start a new worker for a queue.
   */
  public static startWorker(name: string, processor: Processor, options?: Omit<WorkerOptions, 'connection'>): Worker {
    if (this.workers.has(name)) {
      throw new Error(`Worker for queue ${name} is already running.`);
    }

    const worker = new Worker(name, processor, {
      connection: connection as any,
      ...options,
    });

    worker.on('ready', () => {
      logger.info(`Worker for queue ${name} is ready and listening.`);
    });

    worker.on('error', (err: any) => {
      logger.error(err, `Worker for queue ${name} encountered an error:`);
    });

    this.workers.set(name, worker);
    return worker;
  }

  /**
   * Gracefully close all workers.
   */
  public static async closeAll(): Promise<void> {
    const promises = Array.from(this.workers.values()).map(w => w.close());
    await Promise.all(promises);
    this.workers.clear();
  }
}
