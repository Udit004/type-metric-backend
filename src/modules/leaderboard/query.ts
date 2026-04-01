import {
  DEFAULT_LEADERBOARD_LIMIT,
  LeaderboardBoard,
  MAX_LEADERBOARD_LIMIT,
} from "./types.js";
import { isLeaderboardBoard } from "./ranking.js";

export interface LeaderboardQueryParams {
  board: LeaderboardBoard;
  limit: number;
}

export function parseLeaderboardQuery(input: {
  board?: unknown;
  limit?: unknown;
}): LeaderboardQueryParams {
  const board = input.board ?? "combined";

  if (!isLeaderboardBoard(board)) {
    throw new Error("board must be one of combined, solo, or multiplayer");
  }

  if (input.limit === undefined) {
    return {
      board,
      limit: DEFAULT_LEADERBOARD_LIMIT,
    };
  }

  const parsedLimit = Number(input.limit);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    throw new Error(
      `limit must be a positive integer up to ${MAX_LEADERBOARD_LIMIT}`
    );
  }

  return {
    board,
    limit: Math.min(parsedLimit, MAX_LEADERBOARD_LIMIT),
  };
}
