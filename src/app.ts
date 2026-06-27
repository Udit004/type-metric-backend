import cors from "cors";
import express from "express";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import logger from "./logger.js";

import { requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRouter from "./modules/auth/route.js";
import { googleCallback, googleStart } from "./modules/auth/controller.js";
import leaderboardRouter from "./modules/leaderboard/route.js";
import multiplayerRouter from "./modules/multiplayer/route.js";
import profileRouter from "./modules/profile/route.js";
import typingSessionRouter from "./modules/typing-session/route.js";
import ludoRouter from "./modules/ludo/route.js";


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Welcome to the TypeMetric API!" });
  logger.info("Hello from Logtail");
});


app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "typemetric-backend" });
  logger.info("Health check");
});

// app.get("/auth/google", googleStart);
// app.get("/auth/google/callback", googleCallback);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/leaderboard", leaderboardRouter);
app.use("/api/v1/typing-sessions", typingSessionRouter);
app.use("/api/v1/multiplayer", multiplayerRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/ludo", ludoRouter);


app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export default app;
