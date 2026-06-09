import cors from "cors";
import express from "express";
import helmet from "helmet";

import { requestLogger } from "./middlewares/requestLogger.js";
import authRouter from "./modules/auth/route.js";
import { googleCallback, googleStart } from "./modules/auth/controller.js";
import leaderboardRouter from "./modules/leaderboard/route.js";
import multiplayerRouter from "./modules/multiplayer/route.js";
import profileRouter from "./modules/profile/route.js";
import typingSessionRouter from "./modules/typing-session/route.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Welcome to the TypeMetric API!" });
});


app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "typemetric-backend" });
});

// app.get("/auth/google", googleStart);
// app.get("/auth/google/callback", googleCallback);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/leaderboard", leaderboardRouter);
app.use("/api/v1/typing-sessions", typingSessionRouter);
app.use("/api/v1/multiplayer", multiplayerRouter);
app.use("/api/v1/profile", profileRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
