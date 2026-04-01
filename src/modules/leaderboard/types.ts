import {
  LeaderboardBoard,
  LeaderboardSourceMode,
  LeaderboardWindow,
} from "../../models/LeaderboardSnapshot.model.js";

export type { LeaderboardBoard, LeaderboardWindow, LeaderboardSourceMode };

export const LEADERBOARD_BOARDS = [
  "combined",
  "solo",
  "multiplayer",
] as const satisfies readonly LeaderboardBoard[];

export const LEADERBOARD_WINDOW: LeaderboardWindow = "all_time";
export const DEFAULT_LEADERBOARD_LIMIT = 50;
export const MAX_LEADERBOARD_LIMIT = 100;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  bestWpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  sourceMode: LeaderboardSourceMode;
  sourceId: string;
  achievedAt: string;
}

export interface LeaderboardResponse {
  board: LeaderboardBoard;
  window: LeaderboardWindow;
  generatedAt: string;
  totalEntries: number;
  entries: LeaderboardEntry[];
}
