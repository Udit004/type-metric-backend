import { Router } from "express";

import { getLeaderboard } from "./controller.js";

const leaderboardRouter = Router();

leaderboardRouter.get("/", getLeaderboard);

export default leaderboardRouter;
