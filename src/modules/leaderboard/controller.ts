import { Request, Response } from "express";

import { parseLeaderboardQuery } from "./query.js";
import { getLeaderboardSnapshot } from "./service.js";

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const { board, limit } = parseLeaderboardQuery(req.query);
    const leaderboard = await getLeaderboardSnapshot(board, limit);
    res.status(200).json(leaderboard);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch leaderboard";
    const status = message.startsWith("board must be") || message.startsWith("limit must be")
      ? 400
      : 500;
    res.status(status).json({ message });
  }
}
