import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import {
  closeLeaderboardQueueConnections,
  registerLeaderboardRepeatableJobs,
  startLeaderboardWorker,
} from "./modules/leaderboard/queue.js";

dotenv.config();

let worker = startLeaderboardWorker();

async function start(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();
    await registerLeaderboardRepeatableJobs();

    if (!worker) {
      worker = startLeaderboardWorker();
    }

    console.log("Leaderboard worker started");
  } catch (error) {
    console.error("Leaderboard worker startup failed", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  try {
    if (worker) {
      await worker.close();
      worker = null;
    }

    await closeLeaderboardQueueConnections();
    await disconnectRedis();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

void start();
