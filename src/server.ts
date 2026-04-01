import dotenv from "dotenv";
import { createServer } from "http";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { attachMultiplayerGateway } from "./modules/multiplayer/gateway.js";

dotenv.config();

const port = Number(process.env.PORT || 5000);

async function startServer(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();
    const httpServer = createServer(app);

    attachMultiplayerGateway(httpServer);

    httpServer.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
      console.log(`WebSocket running on ws://localhost:${port}/ws`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
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

void startServer();
