import "../instrument.js";
import dotenv from "dotenv";
import { createServer } from "http";

import app from "./app.js";
import logger from "./core/logger/logger.js";
import { connectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { attachMultiplayerGateway } from "./modules/multiplayer/gateway.js";
import "./core/events/registerListeners.js";



dotenv.config();



const port = Number(process.env.PORT || 5000);

async function startServer(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();
    const httpServer = createServer(app);

    attachMultiplayerGateway(httpServer);
    logger.info("[BOOT] Attaching multiplayer WS gateway at /ws");





    httpServer.listen(port, () => {


      logger.info(`API running on http://localhost:${port}`);
      logger.info(`WebSocket multiplayer running on ws://localhost:${port}/ws`);

    });


  } catch (error) {
    logger.error({ err: error }, "Server startup failed");
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.fatal(error, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ reason, promise }, "Unhandled Rejection");
  process.exit(1);
});

void startServer();
