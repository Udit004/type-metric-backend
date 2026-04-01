import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

import { rebuildLeaderboardSnapshot } from "./service.js";
import { LeaderboardBoard, LEADERBOARD_BOARDS } from "./types.js";

const LEADERBOARD_QUEUE_NAME = "leaderboard-refresh";
const LEADERBOARD_REPAIR_INTERVAL_MS = 10 * 60 * 1000;

let queueConnection: Redis | null = null;
let workerConnection: Redis | null = null;
let queue: Queue | null = null;
let repeatableJobsRegistered = false;

function getRedisUrl(): string | null {
  return process.env.REDIS_URL ?? null;
}

function createConnection(): Redis | null {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

function getQueueConnection(): Redis | null {
  if (!queueConnection) {
    queueConnection = createConnection();
  }

  return queueConnection;
}

function getWorkerConnection(): Redis | null {
  if (!workerConnection) {
    workerConnection = createConnection();
  }

  return workerConnection;
}

function getLeaderboardQueue(): Queue | null {
  if (queue) {
    return queue;
  }

  const connection = getQueueConnection();

  if (!connection) {
    return null;
  }

  queue = new Queue(LEADERBOARD_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });

  return queue;
}

export async function enqueueLeaderboardRefresh(board: LeaderboardBoard): Promise<void> {
  const leaderboardQueue = getLeaderboardQueue();

  if (!leaderboardQueue) {
    return;
  }

  await leaderboardQueue.add(
    "leaderboard-refresh",
    { board },
    {
      jobId: `leaderboard-refresh:${board}`,
    }
  );
}

export async function registerLeaderboardRepeatableJobs(): Promise<void> {
  if (repeatableJobsRegistered) {
    return;
  }

  const leaderboardQueue = getLeaderboardQueue();

  if (!leaderboardQueue) {
    return;
  }

  await Promise.all(
    LEADERBOARD_BOARDS.map((board) =>
      leaderboardQueue.add(
        "leaderboard-repair",
        { board },
        {
          jobId: `leaderboard-repair:${board}`,
          repeat: {
            every: LEADERBOARD_REPAIR_INTERVAL_MS,
          },
        }
      )
    )
  );

  repeatableJobsRegistered = true;
}

export function startLeaderboardWorker(): Worker | null {
  const connection = getWorkerConnection();

  if (!connection) {
    console.warn("REDIS_URL is not set. Leaderboard worker is disabled.");
    return null;
  }

  const worker = new Worker(
    LEADERBOARD_QUEUE_NAME,
    async (job) => {
      const { board } = job.data as { board: LeaderboardBoard };
      await rebuildLeaderboardSnapshot(board);
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, error) => {
    console.error(`Leaderboard job failed: ${job?.id ?? "unknown-job"}`, error);
  });

  return worker;
}

export async function closeLeaderboardQueueConnections(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }

  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
  }

  if (workerConnection) {
    await workerConnection.quit();
    workerConnection = null;
  }
}
