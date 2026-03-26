import cors from "cors";
import express from "express";
import helmet from "helmet";

import { requestLogger } from "./middlewares/requestLogger.js";
import authRouter from "./modules/auth/route.js";

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

app.use("/api/v1/auth", authRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
